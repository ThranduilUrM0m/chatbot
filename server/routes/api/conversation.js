import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const Conversation = mongoose.model('Conversation');
const router = express.Router();

router.post('/', (req, res, next) => {
    const { body } = req;

    if (!body._conversation_user) {
        return res.status(422).json({
            errors: {
                _conversation_user: 'is required',
            },
        });
    }

    const finalConversation = new Conversation(body);
    return finalConversation.save()
        .then(() => {
            res.json({ _Conversation: finalConversation.toJSON() });
        })
        .catch(next);
});

router.get('/', (req, res, next) => {
    return Conversation.find()
        .sort({ createdAt: 'descending' })
        .then((_conversations) => res.json({ _conversations: _conversations.map(_conversation => _conversation.toJSON()) }))
        .catch(next);
});

router.param('id', (req, res, next, id) => {
    return Conversation.findById(id)
        .then(_conversation => {
            if (!_conversation) {
                return res.sendStatus(404);
            }
            req._conversation = _conversation;
            next();
        })
        .catch(next);
});

router.get('/:id', (req, res, next) => {
    return res.json({
        _conversation: req._conversation.toJSON()
    })
});

router.patch('/:id', (req, res, next) => {
    const { body } = req;

    if (typeof body._conversation_user !== 'undefined') {
        req._conversation._conversation_user = body._conversation_user;
    }

    if (typeof body.chatHistory !== 'undefined') {
        req._conversation.chatHistory = body.chatHistory;
        req._conversation.totalMessages = body.chatHistory.length;
        req._conversation.totalAssistantMessages = body.chatHistory.filter(msg => msg.role === 'assistant').length;
    }

    if (typeof body.totalMessages !== 'undefined') {
        req._conversation.totalMessages = body.totalMessages;
    }

    if (typeof body.totalAssistantMessages !== 'undefined') {
        req._conversation.totalAssistantMessages = body.totalAssistantMessages;
    }

    if (typeof body.totalResponseTime !== 'undefined') {
        req._conversation.totalResponseTime = body.totalResponseTime;
    }

    if (typeof body.avgResponseTime !== 'undefined') {
        req._conversation.avgResponseTime = body.avgResponseTime;
    }

    if (typeof body.totalInactivityTime !== 'undefined') {
        req._conversation.totalInactivityTime = body.totalInactivityTime;
    }

    if (typeof body.lastMessageTimestamp !== 'undefined') {
        req._conversation.lastMessageTimestamp = body.lastMessageTimestamp;
    }

    return req._conversation.save()
        .then(() => res.json({ _conversation: req._conversation.toJSON() }))
        .catch(next);
});

router.delete('/:id', async (req, res, next) => {
    const { id } = req.params;

    try {
        const deletedConversation = await Conversation.findByIdAndDelete(id);

        if (!deletedConversation) {
            return res.status(404).json({ success: false, error: 'Conversation non trouvée' });
        }

        res.status(200).json({ success: true, message: 'Conversation supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Une erreur s\'est produite lors de la suppression de la conversation' });
    }
});

export default router;