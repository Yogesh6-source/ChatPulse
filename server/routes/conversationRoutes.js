import express from 'express';
import {
  getOrCreateConversation,
  getUserConversations,
  getConversationById,
} from '../controllers/conversationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All conversation routes require authentication

router.post('/', getOrCreateConversation);
router.get('/', getUserConversations);
router.get('/:id', getConversationById);

export default router;
