import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import {
  uploadVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  recordView,
  toggleLike,
  getVideoLikeStatus,
  getRelatedVideos,
  getTrendingVideos,
  getCategories,
} from '../controllers/videoController';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/commentController';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/authMiddleware';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../utils/errors';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'Upload limit reached. Please try again later.',
});

const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'You are commenting too fast. Please slow down.',
});

// Public read endpoints
router.get('/', asyncHandler(getVideos));
router.get('/trending', asyncHandler(getTrendingVideos));
router.get('/categories', asyncHandler(getCategories));
router.get('/:id', optionalAuth, asyncHandler(getVideoById));
router.get('/:id/related', asyncHandler(getRelatedVideos));
router.get('/:id/like', authenticateToken, asyncHandler(getVideoLikeStatus));
router.get('/:id/comments', asyncHandler(getComments));

// Authenticated write endpoints
router.post('/upload', authenticateToken, uploadLimiter, upload.single('video'), asyncHandler(uploadVideo));
router.patch('/:id', authenticateToken, asyncHandler(updateVideo));
router.delete('/:id', authenticateToken, asyncHandler(deleteVideo));
router.post('/:id/view', asyncHandler(recordView));
router.post('/:id/like', authenticateToken, asyncHandler(toggleLike));
router.post('/:id/comments', authenticateToken, commentLimiter, asyncHandler(createComment));
router.patch('/:id/comments/:commentId', authenticateToken, asyncHandler(updateComment));
router.delete('/:id/comments/:commentId', authenticateToken, asyncHandler(deleteComment));

export default router;
