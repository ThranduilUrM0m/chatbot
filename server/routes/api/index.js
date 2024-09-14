import express from 'express';
import permission from './permission.js';
import role from './role.js';
import token from './token.js';
import user from './user.js';

const router = express.Router();
router.use('/permission', permission);
router.use('/role', role);
router.use('/token', token);
router.use('/user', user);

export default router;