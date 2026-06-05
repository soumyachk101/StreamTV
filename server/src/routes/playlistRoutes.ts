import { Router } from 'express';
import {
  getMyPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
} from '../controllers/playlistController';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/errors';

const router = Router();

router.get('/', authenticateToken, asyncHandler(getMyPlaylists));
router.post('/', authenticateToken, asyncHandler(createPlaylist));
router.get('/:id', optionalAuth, asyncHandler(getPlaylist));
router.patch('/:id', authenticateToken, asyncHandler(updatePlaylist));
router.delete('/:id', authenticateToken, asyncHandler(deletePlaylist));
router.post('/:id/videos', authenticateToken, asyncHandler(addVideoToPlaylist));
router.delete('/:id/videos/:videoId', authenticateToken, asyncHandler(removeVideoFromPlaylist));

export default router;
