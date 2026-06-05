import { Router } from 'express';
import {
  getChannel,
  getChannelVideos,
  toggleSubscribe,
  getChannelStats,
  getMySubscriptions,
  getLikedVideos,
  getWatchHistory,
} from '../controllers/channelController';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/errors';

const router = Router();

router.get('/me/subscriptions', authenticateToken, asyncHandler(getMySubscriptions));
router.get('/me/liked', authenticateToken, asyncHandler(getLikedVideos));
router.get('/me/history', authenticateToken, asyncHandler(getWatchHistory));
router.get('/:username', optionalAuth, asyncHandler(getChannel));
router.get('/:username/videos', asyncHandler(getChannelVideos));
router.get('/:username/stats', asyncHandler(getChannelStats));
router.post('/:username/subscribe', authenticateToken, asyncHandler(toggleSubscribe));

export default router;
