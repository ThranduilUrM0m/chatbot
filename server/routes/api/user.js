import mongoose from 'mongoose';
import express from 'express';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import crypto from 'crypto';
import passwordHash from 'password-hash';
import jwt from 'jsonwebtoken';
import uploadMiddleware from '../../multer/index.js';
import _ from 'lodash';

const User = mongoose.model('User');
const Token = mongoose.model('Token');
const Role = mongoose.model('Role');
const Notification = mongoose.model('Notification');
const router = express.Router();

const _sendMessage = async (_emailSender, _name, _phone, _newsletter, _subject, _message, _emailReceiver, _callback) => {
    //send a verification mail to the user's email
    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.API_KEY;
    new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
        'sender': {
            'email': _emailSender,
            'name': _name,
            ...(_phone !== null ? { 'phone': _phone } : {}),
            ...(_newsletter !== null ? { 'newsletter': _newsletter } : {})
        },
        'subject': _subject,
        'htmlContent': '<!DOCTYPE html><html><body>' + _message + (_phone !== null ? '<br/><p style="margin: 0;">phone: ' + _phone + '</p>' : '') + '' + (_newsletter !== null ? '<p style="margin: 0;">newsletter: ' + _newsletter + '</p>' : '') + '</body></html>',
        'messageVersions': [
            {
                'to': [
                    {
                        'email': _emailReceiver
                    }
                ]
            }
        ]
    }).then((data) => {
        // Invoke the callback function with the data
        _callback(null, data);
    }, (error) => {
        // Invoke the callback function with the error
        _callback(error, null);
    });
}

router.post('/', uploadMiddleware, async (req, res, next) => {
    const { body } = req;

    try {
        if (!body._user_email) {
            return res.status(422).json({
                errors: {
                    _user_email: 'is required',
                },
            });
        }

        if (!body._user_username) {
            return res.status(422).json({
                errors: {
                    _user_username: 'is required',
                },
            });
        }

        if (!body._user_password) {
            if (!body._user_passwordNew && !body._user_passwordNewConfirm) {
                return res.status(422).json({
                    errors: {
                        _user_password: 'is required',
                    },
                });
            } else if (body._user_passwordNew || body._user_passwordNewConfirm) {
                if (!body._user_passwordNew) {
                    return res.status(422).json({
                        errors: {
                            _user_passwordNew: 'is required',
                        },
                    });
                }
                if (!body._user_passwordNewConfirm) {
                    return res.status(422).json({
                        errors: {
                            _user_passwordNewConfirm: 'is required',
                        },
                    });
                }
            }
        }

        if (!body._user_fingerprint) {
            return res.status(422).json({
                errors: {
                    _user_fingerprint: 'is required',
                },
            });
        }

        /* Test for duplicates */
        const _userByEmail = await User.findOne({ _user_email: body._user_email });
        const _userByUsername = await User.findOne({ _user_username: body._user_username });
        if (_userByEmail) {
            return res.status(400).json({
                text: 'Cet e-mail existe déjà, pouvez-vous, Veuillez soumettre un autre e-mail.'
            });
        }
        if (_userByUsername) {
            return res.status(400).json({
                text: 'Ce nom d\'utilisateur existe déjà, pouvez-vous, Veuillez soumettre un autre nom d\'utilisateur.'
            });
        }

        // Sauvegarde de l'utilisateur en base
        const finalUser = new User({
            _user_password: body._user_password
                ? passwordHash.generate(body._user_password)
                : passwordHash.generate(body._user_passwordNew),
            ...body // This will include the rest of the body properties, but _user_password won't be overwritten
        });

        // Parse and process the Role field if provided
        if (body.Role) {
            try {
                // Parse the Role JSON string correctly
                const parsedRole = JSON.parse(body.Role);

                // Ensure we are getting an array of roles
                if (!Array.isArray(parsedRole)) {
                    return res.status(400).json({ text: 'Invalid Role format.' });
                }

                // Extract the _id array from the parsed roles
                const roleIds = parsedRole.map(role => role._id);

                // Validate the role IDs
                if (!roleIds || roleIds.length === 0) {
                    return res.status(400).json({ text: 'No role IDs provided.' });
                }

                // Find the roles from the database based on the _id array
                const roles = await Role.find({ _id: { $in: roleIds } });

                if (!roles || roles.length === 0) {
                    return res.status(400).json({ text: 'No valid roles found.' });
                }

                // Add found roles to user.Role array (ensure correct type)
                finalUser.Role = roles.map(role => role._id); // Store ObjectId references

            } catch (error) {
                return res.status(400).json({
                    text: 'Error parsing Role field or invalid Role format.',
                    error
                });
            }
        }

        await finalUser.save();

        // Create a verification token for this user
        const finalToken = new Token({ User: finalUser, _userIsVerified: false, _token_body: crypto.randomBytes(16).toString('hex') });
        await finalToken.save();

        // What to do after sending the Email
        const _sendMessageCallback = (error, data) => {
            if (error) {
                return res.status(200).json({
                    _messageText: error
                });
            } else {
                return res.status(200).json({
                    _user: finalUser,
                    _messageText: 'And that\'s it, only thing left is verify your email.\nWe have sent you an email verification.',
                    _message: data
                });
            }
        };

        // send a verification mail to the user's email
        _sendMessage(process.env.EMAIL, 'Chatbot.', null, null, 'Hello ✔ and Welcome', '<h1>We are happy to be working with you ' + body._user_username + '</h1><br/><p style="margin: 0;">Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + finalToken._token_body + '.\n' + '</p><br/><p style="margin: 0;">We Thank you for your faith in us.</p>', finalUser._user_email, _sendMessageCallback);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error });
    }
});

router.get('/', (req, res, next) => {
    return User.find()
        .populate('Role')
        .sort({ createdAt: 'descending' })
        .then((_users) => res.json({ _users: _users.map(_user => _user.toJSON()) }))
        .catch(next);
});

router.post('/_confirm', async (req, res, next) => {
    const { body } = req;

    const _t = await Token.findOne({ _token_body: body._tokenID });
    if (!_t) return res.status(400).json({ text: 'We were unable to find a valid token. Your token may have expired. Or your account is already activated.\nPlease contact us if you\'re experiencing any difficulties, we are happy to be of any help.' });

    const _u = await User.findOne({ _id: _t.User._id });
    if (!_u) return res.status(400).json({ text: 'We were unable to find a user for this token.\nPlease contact us if you\'re experiencing any difficulties, we are happy to be of any help.' });
    if (_u._user_isVerified) return res.status(400).json({ text: 'This user has already been verified.\nPlease contact us if you\'re experiencing any difficulties, we are happy to be of any help.' });
    _u._user_isVerified = true;
    _t._userIsVerified = true;

    try {
        await _u.save()
            .then(async (__u) => {
                /* Notification */
                let notification = new Notification({
                    _notification_title: `L'utilisateur ${__u._user_username} vient de confirmer son email .`,
                    _notification_user: __u.toJSON()
                });

                await notification.save();
            });
        await _t.save();
        return res.status(200).json({
            _user: _u,
            _token: _t,
            text: 'And that\'s it, your account has been verified.\nYou are now part of us.\nYou will be redirected to the login page upon closing this message.'
        });
    } catch (error) {
        console.log(error);
    }
});

router.get('/_checkToken', async (req, res) => {
    const token = req.headers.authorization.split(' ')[1]; // Extract the token from the Authorization header

    try {
        // Verify the token
        const decodedToken = jwt.verify(token, '_chatbot');

        // If the token is valid, the decoded token will contain user data
        const __id = decodedToken.sub;

        // Find the user using the __id (or any other identifier, depending on your database schema)
        const __user = await User.findById(__id)
            .populate('Role');
        return __user ? res.status(200).json({ _user: __user }) : res.sendStatus(401);
    } catch (error) {
        // If the token is invalid or has expired, send a 401 response
        res.sendStatus(401);
    }
});

router.post('/_sendMessage', async (req, res, next) => {
    const { body } = req;

    try {
        // What to do after sending the Email
        const _sendMessageCallback = (error, data) => {
            if (error) {
                return res.status(200).json({
                    _message: error
                });
            } else {
                return res.status(200).json({
                    _message: data
                });
            }
        };

        //send a verification mail to the user's email
        _sendMessage(body._emailSender, body._name, body._phone, body._newsletter, 'Feedback', body._message, process.env.EMAIL, _sendMessageCallback);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error });
    }
});

router.post('/_login', async (req, res, next) => {
    const { body } = req;

    try {
        if (!body._user_identification || !body._user_password) {
            // Le cas où l'email/username ou bien le password ne serait pas soumit ou nul
            return res.status(400).json({
                text: 'Veuillez remplir à la fois l\'identification et le mot de passe.'
            });
        }

        // On check si l'utilisateur existe en base
        const findUser = await User.findOne({
            $or: [
                { _user_email: { $regex: new RegExp(body._user_identification, 'i') } },
                { _user_username: { $regex: new RegExp(body._user_identification, 'i') } }
            ]
        })
            .populate('Role');

        if (!findUser)
            return res.status(401).json({
                text: 'Verify your identification, this account is not registred.'
            });
        if (!findUser._user_isVerified)
            return res.status(401).json({
                text: 'Your account has not been verified. Please check your inbox for a verification email that was sent to you.\nPlease contact us if you\'re experiencing any difficulties, we are happy to be of any help.'
            });
        if (!findUser.authenticate(body._user_password, findUser))
            return res.status(401).json({
                text: 'Incorrect Password Inserted.\nPlease verify your password and try again.'
            });

        const findUserUpdated = await User.findOneAndUpdate(
            {
                $or: [
                    { _user_email: body._user_identification },
                    { _user_username: body._user_identification },
                ],
            },
            {
                $set: {
                    _user_isActive: true,
                },
                $push: {
                    _user_logindate: new Date(),
                },
            },
            { upsert: true }
        )
            .populate('Role')
            .then(async (__u) => {
                /* Notification */
                const notification = new Notification({
                    _notification_title: `L'utilisateur ${__u._user_username} vient de se connecter .`,
                    _notification_user: __u.toJSON()
                });

                await notification.save();

                // Once the user is created or updated, generate a JWT token
                const token = __u.getToken();

                return res.status(200).json({
                    _user: __u,
                    token: token,
                    text: 'Authentification réussie.',
                });
            });
    } catch (error) {
        return res.status(500).json({ text: 'Nous rencontrons des problèmes internes' });
    }
});

router.post('/_logout/:id', async (req, res, next) => {
    const { body } = req;

    try {
        if (!_.isEmpty(body._user_isVerified) && !_.isUndefined(body._user_isVerified)) {
            if (typeof body._user_isVerified !== 'undefined') {
                req._user._user_isVerified = false;
            }
        }

        return await req._user.save()
            .then(async (__u) => {
                /* Notification */
                let notification = new Notification({
                    _notification_title: `L'utilisateur ${__u._user_username} vient de se déconnecter .`,
                    _notification_user: __u.toJSON()
                });

                await notification.save();
                res.json({ _user: req._user.toJSON() })
            })
            .catch(next);
    } catch (error) {
        return res.status(500).json({ error });
    }
});

router.param('id', (req, res, next, id) => {
    return User.findById(id)
        .populate('Role')
        .then(_user => {
            if (!_user) {
                return res.sendStatus(404);
            }
            req._user = _user;
            next();
        })
        .catch(next);
});

router.get('/:id', (req, res, next) => {
    // Access the user object from req._user
    const _user = req._user;

    // Populate the 'Role' and 'Expertise' fields
    _user
        .populate('Role')
        .then(() => {
            return res.json({
                _user: _user.toJSON()
            });
        })
        .catch(next);
});

router.patch('/:id', uploadMiddleware, async (req, res, next) => {
    const { body } = req;
    let __updatedFields = [];

    try {
        if (typeof body._user_email !== 'undefined') {
            req._user._user_email = body._user_email;
            __updatedFields.push('Email');
        }

        if (typeof body._user_username !== 'undefined') {
            req._user._user_username = body._user_username;
            __updatedFields.push('Nom d\'utilisateur');
        }

        if (!_.isEmpty(body._user_password) && !_.isUndefined(body._user_password)) {
            if (typeof body._user_password !== 'undefined') {
                if (!passwordHash.verify(body._user_password, req._user._user_password)) {
                    return res.status(400).json({
                        text: 'Password Incorrect'
                    });
                } else {
                    req._user._user_password = passwordHash.generate(body._user_passwordNew);
                    __updatedFields.push('Mot de passe');
                }
            }
        }

        if (!_.isEmpty(body._user_fingerprint) && !_.isUndefined(body._user_fingerprint)) {
            if (typeof body._user_fingerprint !== 'undefined') {
                req._user._user_fingerprint = body._user_fingerprint;
                __updatedFields.push('fingerprint');
            }
        }

        if (!_.isEmpty(req.imageUrl) && !_.isUndefined(req.imageUrl)) {
            if (typeof req.imageUrl !== 'undefined') {
                req._user._user_picture = req.imageUrl;
                __updatedFields.push('Photo de profil');
            }
        }

        if (!_.isEmpty(body._user_firstname) && !_.isUndefined(body._user_firstname)) {
            if (typeof body._user_firstname !== 'undefined') {
                req._user._user_firstname = body._user_firstname;
                __updatedFields.push('Prénom');
            }
        }

        if (!_.isEmpty(body._user_lastname) && !_.isUndefined(body._user_lastname)) {
            if (typeof body._user_lastname !== 'undefined') {
                req._user._user_lastname = body._user_lastname;
                __updatedFields.push('Nom');
            }
        }

        if (!_.isEmpty(body._user_city) && !_.isUndefined(body._user_city)) {
            if (typeof body._user_city !== 'undefined') {
                req._user._user_city = body._user_city;
                __updatedFields.push('Ville');
            }
        }

        if (!_.isEmpty(body._user_country) && !_.isUndefined(body._user_country)) {
            if (typeof JSON.parse(body._user_country) !== 'undefined') {
                req._user._user_country = JSON.parse(body._user_country);
                __updatedFields.push('Pays');
            }
        }

        if (!_.isEmpty(body._user_phone) && !_.isUndefined(body._user_phone)) {
            if (typeof body._user_phone !== 'undefined') {
                req._user._user_phone = body._user_phone;
                __updatedFields.push('Numéro de téléphone');
            }
        }

        if (!_.isEmpty(body._user_isVerified) && !_.isUndefined(body._user_isVerified)) {
            if (typeof body._user_isVerified !== 'undefined') {
                req._user._user_isVerified = body._user_isVerified;
            }
        }

        if (!_.isEmpty(body._user_isActive) && !_.isUndefined(body._user_isActive)) {
            if (typeof body._user_isActive !== 'undefined') {
                req._user._user_isActive = body._user_isActive;
            }
        }

        if (!_.isEmpty(body._user_logindate) && !_.isUndefined(body._user_logindate)) {
            if (typeof body._user_logindate !== 'undefined') {
                req._user._user_logindate = body._user_logindate;
            }
        }

        if (!_.isEmpty(body.Role) && !_.isUndefined(body.Role)) {
            if (typeof body.Role !== 'undefined') {
                req._user.Role = body.Role;
                __updatedFields.push('Role');
            }
        }

        return await req._user.save()
            .then(async (__u) => {
                /* Notification */
                let notification = new Notification({
                    _notification_title: `L'utilisateur ${__u._user_username} vient de modifier son ${__updatedFields.join(', ')}.`,
                    _notification_user: __u.toJSON()
                });

                await notification.save();
                res.json({ _user: req._user.toJSON() })
            })
            .catch(next);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error });
    }
});

router.delete('/:id', (req, res, next) => {
    return User.findByIdAndDelete(req._user._id)
        .then(async (__u) => {
            /* Notification */
            let notification = new Notification({
                _notification_title: `Un utilisateur vient d'être supprimer.`,
                _notification_user: __u.toJSON()
            });

            await notification.save();
            res.json({ _user: req._user.toJSON() })
        })
        .catch(next);
});

export default router;