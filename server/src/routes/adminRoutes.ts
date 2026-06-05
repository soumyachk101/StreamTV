import { Router } from 'express';
import {
  getStats,
  getUsers,
  updateUserRole,
  verifyUser,
  adminDeleteVideo,
  adminListVideos,
} from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/errors';

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get('/stats', asyncHandler(getStats));
router.get('/users', asyncHandler(getUsers));
router.patch('/users/:id/role', asyncHandler(updateUserRole));
router.patch('/users/:id/verify', asyncHandler(verifyUser));

router.get('/videos', asyncHandler(adminListVideos));
router.delete('/videos/:id', asyncHandler(adminDeleteVideo));

export default router;
