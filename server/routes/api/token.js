import mongoose from 'mongoose';
import express from 'express';

const Token = mongoose.model('Token');
const router = express.Router();

router.post('/', (req, res, next) => {
    const { body } = req;

    if (!body.User) {
        return res.status(422).json({
            errors: {
                User: 'is required',
            },
        });
    }

    if (!body._userIsVerified) {
        return res.status(422).json({
            errors: {
                _userIsVerified: 'is required',
            },
        });
    }

    if (!body._token_body) {
        return res.status(422).json({
            errors: {
                _token_body: 'is required',
            },
        });
    }

    const finalToken = new Token(body);
    return finalToken.save()
        .then(() => {
            res.json({ _token: finalToken.toJSON() });
        })
        .catch(next);
});

router.get('/', (req, res, next) => {
    return Token.find()
        .populate('Token')
        .sort({ createdAt: 'descending' })
        .then((_testimonies) => res.json({ _testimonies: _testimonies.map(_token => _token.toJSON()) }))
        .catch(next);
});

router.param('id', (req, res, next, id) => {
    return Token.findById(id)
        .populate('Token')
        .then(_token => {
            if (!_token) {
                return res.sendStatus(404);
            }
            req._token = _token;
            next();
        })
        .catch(next);
});

router.get('/:id', (req, res, next) => {
    return res.json({
        _token: req._token.toJSON()
    })
});

router.patch('/:id', (req, res, next) => {
    const { body } = req;
    
    if (typeof body.User !== 'undefined') {
        req._token.User = body.User;
    }

    if (typeof body._userIsVerified !== 'undefined') {
        req._token._userIsVerified = body._userIsVerified;
    }

    if (typeof body._token_body !== 'undefined') {
        req._token._token_body = body._token_body;
    }

    return req._token.save()
        .then(() => res.json({ _token: req._token.toJSON() }))
        .catch(next);
});

router.delete('/:id', (req, res, next) => {
    return Token.findByIdAndRemove(req._token._id)
        .then(() => res.sendStatus(200))
        .catch(next);
});

export default router;