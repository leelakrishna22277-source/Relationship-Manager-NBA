import { Router } from 'express';
import { login, getMe, logout } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;
