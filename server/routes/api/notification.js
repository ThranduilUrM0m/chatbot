import mongoose from 'mongoose';
import express from 'express';

const Notification = mongoose.model('Notification');
const router = express.Router();

router.post('/', (req, res, next) => {
    const { body } = req;

    if (!body._notification_title) {
        return res.status(422).json({
            errors: {
                _notification_title: 'is required',
            },
        });
    }

    if (!body._notification_user) {
        return res.status(422).json({
            errors: {
                _notification_user: 'is required',
            },
        });
    }

    const finalNotification = new Notification(body);
    return finalNotification.save()
        .then(() => {
            res.json({ _notification: finalNotification.toJSON() });
        })
        .catch(next);
});

router.get('/', (req, res, next) => {
    return Notification.find()
        .sort({ createdAt: 'descending' })
        .then((_notifications) => res.json({ _notifications: _notifications.map(_notification => _notification.toJSON()) }))
        .catch(next);
});

router.param('id', (req, res, next, id) => {
    return Notification.findById(id)
        .then(_notification => {
            if (!_notification) {
                return res.sendStatus(404);
            }
            req._notification = _notification;
            next();
        })
        .catch(next);
});

router.get('/:id', (req, res, next) => {
    return res.json({
        _notification: req._notification.toJSON()
    })
});

router.patch('/:id', (req, res, next) => {
    const { body } = req;

    if (typeof body._notification_title !== 'undefined') {
        req._notification._notification_title = body._notification_title;
    }

    if (typeof body._notification_user !== 'undefined') {
        req._notification._notification_user = body._notification_user;
    }

    if (typeof body._notification_data !== 'undefined') {
        req._notification._notification_data = body._notification_data;
    }

    return req._notification.save()
        .then(() => res.json({ _notification: req._notification.toJSON() }))
        .catch(next);
});

router.delete('/:id', (req, res, next) => {
    return Notification.findByIdAndDelete(req._notification._id)
        .then(() => res.sendStatus(200))
        .catch(next);
});

export default router;