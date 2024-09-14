/*
    Add Models this way :
    import Model from './models/Model.js';
*/
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
import router from './routes/index.js';
import passport from 'passport';
import './config/passport.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

let workers = [];

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
        .connect(process.env.MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
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