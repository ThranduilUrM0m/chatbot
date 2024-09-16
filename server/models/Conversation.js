import mongoose from 'mongoose';

const { Schema } = mongoose;
const Message = new Schema({
    role: {
        type: String, // '_conversation_user' or 'assistant'
        required: true
    },
    content: {
        type: String,
        required: true
    },
    /* timestamp true */
    timestamp: {
        type: Date,
        default: Date.now
    },
    responseTime: {
        type: Number, // Time in milliseconds for assistant's response (only applies to assistant messages)
        default: null
    }
});

/* Fréquence d'utilisation */
const Conversation = new Schema({
    _conversation_user: {
        type: String,
        required: true
    },
    chatHistory: [Message],
    /* Secondary Graph add timestamp */
    totalMessages: {
        type: Number,
        default: 0
    },
    totalAssistantMessages: {
        type: Number,
        default: 0
    },
    totalResponseTime: {
        type: Number,
        default: 0
    },
    avgResponseTime: {
        type: Number,
        default: 0
    },
    totalInactivityTime: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.models.Conversation || mongoose.model('Conversation', Conversation);