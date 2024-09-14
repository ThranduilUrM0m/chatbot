import mongoose from 'mongoose';
import express from 'express';

const Role = mongoose.model('Role');
const router = express.Router();

router.post('/', (req, res, next) => {
    const { body } = req;

    if (!body._role_title) {
        return res.status(422).json({
            errors: {
                _role_title: 'is required',
            },
        });
    }

    const finalRole = new Role(body);
    return finalRole.save()
        .then(() => {
            res.json({ _role: finalRole.toJSON() });
        })
        .catch(next);
});

router.get('/', (req, res, next) => {
    return Role.find()
        .populate('Permission')
        .sort({ createdAt: 'descending' })
        .then((_roles) => res.json({ _roles: _roles.map(_role => _role.toJSON()) }))
        .catch(next);
});

router.param('id', (req, res, next, id) => {
    return Role.findById(id)
        .populate('Permission')
        .then(_role => {
            if (!_role) {
                return res.sendStatus(404);
            }
            req._role = _role;
            next();
        })
        .catch(next);
});

router.get('/:id', (req, res, next) => {
    return res.json({
        _role: req._role.toJSON()
    })
});

router.patch('/:id', (req, res, next) => {
    const { body } = req;

    if (typeof body._role_title !== 'undefined') {
        req._role._role_title = body._role_title;
    }

    if (typeof body._role_description !== 'undefined') {
        req._role._role_description = body._role_description;
    }

    if (typeof body.Permission !== 'undefined') {
        req._role.Permission = body.Permission;
    }

    return req._role.save()
        .then(() => res.json({ _role: req._role.toJSON() }))
        .catch(next);
});

router.delete('/:id', (req, res, next) => {
    return Role.findByIdAndRemove(req._role._id)
        .then(() => res.sendStatus(200))
        .catch(next);
});

export default router;