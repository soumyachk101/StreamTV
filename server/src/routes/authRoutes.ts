import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import {
  register,
  login,
  googleSignIn,
  logout,
  logoutAll,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  checkAvailability,
  uploadAvatar,
  uploadBanner,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { avatarUpload, bannerUpload } from '../middleware/upload';
import { asyncHandler } from '../utils/errors';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.',
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please try again later.',
});

router.post('/register', authLimiter, asyncHandler(register));
router.post('/login', authLimiter, asyncHandler(login));
router.post('/google-signin', authLimiter, asyncHandler(googleSignIn));
router.post('/logout', authenticateToken, asyncHandler(logout));
router.post('/logout-all', authenticateToken, asyncHandler(logoutAll));
router.get('/me', authenticateToken, asyncHandler(getMe));
router.patch('/me', authenticateToken, asyncHandler(updateProfile));
router.post('/upload-avatar', authenticateToken, avatarUpload.single('avatar'), asyncHandler(uploadAvatar));
router.post('/upload-banner', authenticateToken, bannerUpload.single('banner'), asyncHandler(uploadBanner));
router.post('/change-password', authenticateToken, asyncHandler(changePassword));
router.post('/forgot-password', passwordLimiter, asyncHandler(requestPasswordReset));
router.post('/reset-password', passwordLimiter, asyncHandler(resetPassword));
router.get('/check-availability', asyncHandler(checkAvailability));

export default router;
