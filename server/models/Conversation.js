import mongoose from 'mongoose';

const { Schema } = mongoose;
const Message = new Schema({
    role: {
        /* '_conversation_user' or 'assistant' */
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    responseTime: {
        type: Number,
        default: null
    },
}, { timestamps: true });

/* Secondary Graph add timestamp */
/* Fréquence d'utilisation */
const Conversation = new Schema({
    _conversation_user: {
        type: String,
        required: true
    },
    chatHistory: [Message],
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
    },
    lastMessageTimestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.Conversation || mongoose.model('Conversation', Conversation);