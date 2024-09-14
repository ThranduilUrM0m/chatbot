import express from 'express';
import conversation from './conversation.js';
import permission from './permission.js';
import role from './role.js';
import token from './token.js';
import user from './user.js';

const router = express.Router();
router.use('/conversation', conversation);
router.use('/permission', permission);
router.use('/role', role);
router.use('/token', token);
router.use('/user', user);

export default router;