import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const Permission = mongoose.model('Permission');
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

    const finalPermission = new Permission(body);
    return finalPermission.save()
        .then(() => {
            res.json({ _permission: finalPermission.toJSON() });
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
    }

    if (typeof body.totalInactivityTime !== 'undefined') {
        req._conversation.totalInactivityTime = body.totalInactivityTime;
    }

    return req._conversation.save()
        .then(() => res.json({ _conversation: req._conversation.toJSON() }))
        .catch(next);
});

router.delete('/:id', (req, res, next) => {
    return Conversation.findByIdAndRemove(req._conversation._id)
        .then(() => res.sendStatus(200))
        .catch(next);
});

export default router;