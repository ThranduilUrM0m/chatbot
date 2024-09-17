/*
    Add Models this way :
    import Model from './models/Model.js';
*/
import Conversation from './models/Conversation.js';
import Notification from './models/Notification.js';
import Permission from './models/Permission.js';
import Role from './models/Role.js';
import Token from './models/Token.js';
import User from './models/User.js';

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import os from 'os';
import cluster from 'cluster';
import dotenv from 'dotenv';
/* Routes */
import router from './routes/index.js';
import passport from 'passport';
import OpenAI from 'openai';
import './config/passport.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

let workers = [];

/* Multithread */
const setupWorkerProcesses = () => {
    // to read number of cores on system
    let numCores = os.cpus().length;
    console.log('Master cluster setting up ' + numCores + ' workers');

    // iterate on number of cores need to be utilized by an application
    // current example will utilize all of them
    for (let i = 0; i < numCores; i++) {
        // creating workers and pushing reference in an array
        // these references can be used to receive messages from workers
        workers.push(cluster.fork());

        // to receive messages from worker process
        workers[i].on('message', (message) => {
            console.log(message);
        });
    }

    // process is clustered on a core and process id is assigned
    cluster.on('online', (worker) => {
        console.log('Worker ' + worker.process.pid + ' is listening');
    });

    // if any of the worker process dies then start a new one by simply forking another one
    cluster.on('exit', (worker, code, signal) => {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
        workers.push(cluster.fork());
        // to receive messages from worker process
        workers[workers.length - 1].on('message', (message) => {
            console.log(message);
        });
    });
}

const setUpExpress = () => {
    //On définit notre objet express nommé app
    const app = express();
    app.use(cors());

    // Initialize Passport.js
    app.use(passport.initialize());

    // Middleware for handling authentication
    app.use((req, res, next) => {
        passport.authenticate('jwt', { session: false }, (err, user) => {
            if (user) {
                req.user = user;
            }
            next();
        })(req, res, next);
    });

    //Connexion à la base de donnée
    mongoose.Promise = global.Promise;
    mongoose
        .connect(process.env.MONGODB_URI, {})
        .then(() => {
            console.log('Connected to mongoDB');
        })
        .catch((e) => {
            console.log('Error while DB connecting');
            console.log(e);
        });
    mongoose.set('debug', true);

    let db = mongoose.connection;
    db.on('error', () => { console.log('---FAILED to connect to mongoose') });
    db.once('open', () => { console.log('+++Connected to mongoose') });


    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(morgan('dev'));

    /* Cookie lifetime */
    app.use(session({ secret: '_secret', cookie: { maxAge: 60000 }, resave: false, saveUninitialized: false }));

    //Définition du routeur
    app.use(router);

    /*Adds the react production build to serve react requests*/
    app.use(express.static(path.join(__dirname, '../client/build')));

    /*React root*/
    if (process.env.NODE_ENV === 'production') {
        app.use(express.static('client/build'));

        const _path = path;
        app.get('*', (req, res) => {
            res.sendFile(_path.resolve(__dirname, 'client', 'build', 'index.html'))
        })
    }

    //Définition et mise en place du port d'écoute
    const port = process.env.PORT || 5000;

    //our server instance
    const server = http.createServer(app);

    //This creates our socket using the instance of the server
    const io = new Server(server);

    io.on('connection', (socket) => {
        console.log('IO Server Connected');

        socket.on('action', (action) => {
            switch (action.type) {
                case '_userConnected':
                    db.collection('user').find({}).toArray((err, docs) => {
                        io.sockets.emit('action', { type: '_userConnectedLoad', data: { user: docs } });
                    });
                    break;
                case '_userDisonnected':
                    db.collection('user').find({}).toArray((err, docs) => {
                        io.sockets.emit('action', { type: '_userDisonnectedLoad', data: { user: docs } });
                    });
                    break;
                case '_userCreated':
                    db.collection('user').find({}).toArray((err, docs) => {
                        io.sockets.emit('action', { type: '_userCreatedLoad', data: { user: docs } });
                    });
                    break;
                case '_userConfirmed':
                    db.collection('user').find({}).toArray((err, docs) => {
                        io.sockets.emit('action', { type: '_userConfirmedLoad', data: { user: docs } });
                    });
                    break;
                default:
                    return false;
            }
        });

        socket.on('_newConversation', async (data, callback) => {
            const { _conversation_user, chatHistory = [], newConversation } = data; // Default to an empty array if chatHistory is not provided

            if (!Array.isArray(chatHistory)) {
                console.error('Invalid chatHistory format. Expected an array.');
                socket.emit('error', { message: 'Invalid chatHistory format' });
                return;
            }

            try {
                // Find the conversation by ID
                let conversation = await Conversation.findOne({ _conversation_user });

                if (!conversation || newConversation) {
                    const response = await openai.chat.completions.create({
                        model: "gpt-3.5-turbo",
                        messages: [
                            { role: "system", content: "Bonjour !" }, // Specify the language in the system message
                            ...chatHistory,
                        ],
                    });
                    const aiMessage = response.choices[0].message.content;
                    const updatedChatHistory = [...chatHistory, { role: 'assistant', content: aiMessage }];

                    // Save the new conversation to the database
                    conversation = new Conversation({
                        _conversation_user,
                        chatHistory: updatedChatHistory,
                        totalMessages: updatedChatHistory.length,
                        totalAssistantMessages: updatedChatHistory.filter(msg => msg.role === 'assistant').length,
                        language: 'fr', // Specify French as the default language
                    });

                    await conversation.save();

                    // Acknowledge back to the client with the conversation ID and chat history
                    callback({ conversationId: conversation._id, chatHistory: updatedChatHistory });

                    /* Notification */
                    const notification = new Notification({
                        _notification_title: 'Une nouvelle conversation a commencée',
                        _notification_user: { _fingerprint: _conversation_user },
                        _notification_data: conversation,
                    });

                    await notification.save();
                    // Emit the new conversation details to all clients
                    /* socket.emit('newConversation', {
                        user: _conversation_user,
                        chatHistory: updatedChatHistory, // Use updatedChatHistory for new conversations
                        conversationId: conversation._id,
                    }); */
                } else {
                    // Existing conversation found, send the existing chat history
                    callback({ conversationId: conversation._id, chatHistory: conversation.chatHistory });
        
                    // Emit the existing conversation details to all clients
                    socket.emit('newConversation', {
                        user: _conversation_user,
                        chatHistory: conversation.chatHistory, // Use existing chatHistory
                        conversationId: conversation._id,
                    });
                }
            } catch (error) {
                console.error('Error with OpenAI API:', error);
                socket.emit('error', { message: 'Failed to process conversation' });
            }
        });

        socket.on('_sendMessage', async (data) => {
            const { user, conversationId, role, content } = data;

            if (!user || !conversationId || !role || !content) {
                socket.emit('error', { message: 'Invalid message data' });
                return;
            }

            try {
                // Find the conversation by ID
                const conversation = await Conversation.findById(conversationId);

                if (conversation) {
                    const now = new Date();

                    // Add the new message to the chat history
                    const updatedChatHistory = [...conversation.chatHistory, { role, content, timestamp: now }];
                    conversation.chatHistory = updatedChatHistory;
                    conversation.totalMessages = updatedChatHistory.length;
                    conversation.totalAssistantMessages = updatedChatHistory.filter(msg => msg.role === 'assistant').length;

                    // Calculate inactivity time
                    const lastMessageTimestamp = conversation.lastMessageTimestamp;
                    const inactivityTime = now - new Date(lastMessageTimestamp);
                    const totalInactivityTime = conversation.totalInactivityTime + inactivityTime;

                    conversation.totalInactivityTime = totalInactivityTime;
                    conversation.lastMessageTimestamp = now;

                    await conversation.save();

                    /* Notification */
                    let notification = new Notification({
                        _notification_title: `Un nouveau message a éte envoyé dans la conversation ${conversation._id}.`,
                        _notification_user: { _fingerprint: conversation._conversation_user },
                        _notification_data: { role, content },
                    });

                    await notification.save();

                    // Emit the updated conversation to all clients
                    socket.emit('messageSent', { user, chatHistory: updatedChatHistory, role, content });

                    // Generate AI's response using OpenAI API
                    const response = await openai.chat.completions.create({
                        model: "gpt-3.5-turbo",
                        messages: [
                            { role: "system", content: "You are an assistant." }, // System prompt
                            ...updatedChatHistory, // Send the entire conversation so far, including user's message
                        ],
                    });

                    const aiMessage = response.choices[0].message.content;
                    const assistantTimestamp = new Date();

                    // Add AI's response to the chat history
                    const finalChatHistory = [...updatedChatHistory, { role: 'assistant', content: aiMessage, timestamp: assistantTimestamp }];

                    // Calculate response time
                    const lastUserMessage = updatedChatHistory.filter(msg => msg.role === 'user').slice(-1)[0];
                    const responseTime = assistantTimestamp - new Date(lastUserMessage.timestamp);
                    const totalResponseTime = conversation.totalResponseTime + responseTime;
                    const avgResponseTime = totalResponseTime / (conversation.totalAssistantMessages + 1);

                    conversation.chatHistory = finalChatHistory;
                    conversation.totalMessages = finalChatHistory.length;
                    conversation.totalAssistantMessages = finalChatHistory.filter(msg => msg.role === 'assistant').length;
                    conversation.totalResponseTime = totalResponseTime;
                    conversation.avgResponseTime = avgResponseTime;

                    // Save the updated conversation with AI's response
                    await conversation.save();

                    // Emit AI's response to all clients
                    socket.emit('messageSent', { user: 'assistant', chatHistory: finalChatHistory, role: 'assistant', content: aiMessage });

                    /* Notification */
                    let notificationAI = new Notification({
                        _notification_title: `Un nouveau message a éte envoyé dans la conversation ${conversation._id}.`,
                        _notification_user: { _fingerprint: conversation._conversation_user },
                        _notification_data: { role: 'assistant', content: aiMessage },
                    });

                    await notificationAI.save();
                } else {
                    console.error('Conversation not found:', conversationId);
                    socket.emit('error', { message: 'Conversation not found' });
                }
            } catch (error) {
                console.error('Error handling message:', error);
                socket.emit('error', { message: 'Failed to process message' });
            }
        });

        socket.on('disconnect', () => {
            console.log('IO Server Disconnected');
        });
    });

    server.listen(port, () => console.log(`Listening on port ${port}`));
};

/**
 * Setup server either with clustering or without it
 * @param isClusterRequired
 * @constructor
 *
 **/

const setupServer = (isClusterRequired) => {
    if (isClusterRequired && cluster.isPrimary) {
        setupWorkerProcesses();
    } else {
        // to setup server configurations and share port address for incoming requests
        setUpExpress();
    }
};

setupServer(true);