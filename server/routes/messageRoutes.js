import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getMessages,
  sendMessage,
  deleteMessage,
  markMessagesAsRead,
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

// Rate limiter for sending messages
const messageSendLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120, // 120 messages per minute
  message: {
    success: false,
    message: 'Message rate limit exceeded. Please wait a moment.',
  },
});

router.get('/:conversationId', getMessages);
router.post('/', messageSendLimiter, upload.single('attachment'), sendMessage);
router.delete('/:id', deleteMessage);
router.put('/:id/read', markMessagesAsRead);
router.put('/read-all', markMessagesAsRead);

export default router;
