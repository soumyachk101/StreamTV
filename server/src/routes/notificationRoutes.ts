import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from '../controllers/notificationController';
import { authenticateToken } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/errors';

const router = Router();

router.get('/', authenticateToken, asyncHandler(getNotifications));
router.post('/read', authenticateToken, asyncHandler(markAsRead));
router.post('/:id/read', authenticateToken, asyncHandler(markAsRead));
router.delete('/:id', authenticateToken, asyncHandler(deleteNotification));

export default router;
