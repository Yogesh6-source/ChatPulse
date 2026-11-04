import express from 'express';
import { searchUsers, getUserById, updateProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect); // All user routes require authentication

router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.put('/profile', upload.single('avatar'), updateProfile);

export default router;
