import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Rate limiter for authentication attempts (e.g. max 30 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again in 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, upload.single('avatar'), register);
router.post('/login', authLimiter, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
