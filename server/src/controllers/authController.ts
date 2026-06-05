import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import env from '../config/env';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  sanitizeString,
  BIO_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../utils/validation';

interface RegisterBody {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

function signToken(payload: { userId: string; role: 'USER' | 'ADMIN'; username: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
}

function publicUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  subscriberCount: number;
  videoCount: number;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    role: user.role,
    isVerified: user.isVerified,
    subscriberCount: user.subscriberCount,
    videoCount: user.videoCount,
    createdAt: user.createdAt,
  };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as RegisterBody;

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const displayName = typeof body.displayName === 'string'
    ? sanitizeString(body.displayName, USERNAME_MAX_LENGTH)
    : username;

  const emailError = validateEmail(email);
  if (emailError) throw new ValidationError(emailError);

  const usernameError = validateUsername(username);
  if (usernameError) throw new ValidationError(usernameError);

  const passwordError = validatePassword(password);
  if (passwordError) throw new ValidationError(passwordError);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existing) {
    if (existing.email === email) throw new ConflictError('An account with this email already exists', 'EMAIL_TAKEN');
    throw new ConflictError('This username is already taken', 'USERNAME_TAKEN');
  }

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      username,
      displayName,
    },
  });

  const token = signToken({ userId: user.id, role: user.role, username: user.username });
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.header('user-agent')?.substring(0, 500),
      ipAddress: req.ip,
    },
  });

  res.status(201).json({ token, user: publicUser(user) });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as LoginBody;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const emailError = validateEmail(email);
  if (emailError) throw new ValidationError(emailError);
  if (!password) throw new ValidationError('Password is required');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');

  const token = signToken({ userId: user.id, role: user.role, username: user.username });
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.header('user-agent')?.substring(0, 500),
      ipAddress: req.ip,
    },
  });

  res.json({ token, user: publicUser(user) });
};

export const googleSignIn = async (req: Request, res: Response): Promise<void> => {
  const { email, username, displayName, avatarUrl } = req.body || {};
  if (typeof email !== 'string' || !email.trim()) {
    throw new BadRequestError('Email is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    const desiredUsername = typeof username === 'string' && username.trim()
      ? username.trim().replace(/[^a-zA-Z0-9_]/g, '_').substring(0, USERNAME_MAX_LENGTH)
      : normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, USERNAME_MAX_LENGTH);

    const usernameError = validateUsername(desiredUsername);
    let finalUsername = desiredUsername;
    if (usernameError) {
      finalUsername = `user${crypto.randomBytes(4).toString('hex')}`;
    }

    const existingUsername = await prisma.user.findUnique({ where: { username: finalUsername } });
    if (existingUsername) {
      finalUsername = `${finalUsername}${crypto.randomBytes(2).toString('hex')}`;
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, env.BCRYPT_ROUNDS);

    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: finalUsername,
        displayName: typeof displayName === 'string' ? sanitizeString(displayName, USERNAME_MAX_LENGTH) : null,
        avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : null,
        password: hashedPassword,
        isVerified: true,
      },
    });
  }

  const token = signToken({ userId: user.id, role: user.role, username: user.username });
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.header('user-agent')?.substring(0, 500),
      ipAddress: req.ip,
    },
  });

  res.json({ token, user: publicUser(user) });
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const authHeader = req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  res.json({ message: 'Logged out successfully' });
};

export const logoutAll = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  await prisma.session.deleteMany({ where: { userId: req.user.userId } });
  res.json({ message: 'All sessions logged out' });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      role: true,
      isVerified: true,
      subscriberCount: true,
      videoCount: true,
      createdAt: true,
    },
  });

  if (!user) throw new NotFoundError('User not found');
  res.json({ user: publicUser(user) });
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const { displayName, bio, avatarUrl, bannerUrl } = req.body || {};
  const data: Record<string, unknown> = {};

  if (displayName !== undefined) {
    if (typeof displayName !== 'string') throw new BadRequestError('Invalid display name');
    data.displayName = sanitizeString(displayName, USERNAME_MAX_LENGTH);
  }
  if (bio !== undefined) {
    if (typeof bio !== 'string') throw new BadRequestError('Invalid bio');
    data.bio = sanitizeString(bio, BIO_MAX_LENGTH);
  }
  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== 'string') throw new BadRequestError('Invalid avatar URL');
    data.avatarUrl = avatarUrl;
  }
  if (bannerUrl !== undefined) {
    if (bannerUrl !== null && typeof bannerUrl !== 'string') throw new BadRequestError('Invalid banner URL');
    data.bannerUrl = bannerUrl;
  }

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      role: true,
      isVerified: true,
      subscriberCount: true,
      videoCount: true,
      createdAt: true,
    },
  });

  res.json({ user: publicUser(user) });
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    throw new BadRequestError('Current and new password are required');
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new ValidationError(passwordError);

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) throw new NotFoundError('User not found');

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD');

  const hashed = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  // Invalidate other sessions
  const authHeader = req.header('Authorization') || '';
  const currentToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      NOT: { token: currentToken },
    },
  });

  res.json({ message: 'Password updated successfully' });
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body || {};
  if (typeof email !== 'string' || !email.trim()) {
    throw new BadRequestError('Email is required');
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always return success to prevent email enumeration
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // In production, send email here. For now, log it (dev only)
    if (env.NODE_ENV === 'development') {
      console.log(`[DEV] Password reset token for ${user.email}: ${token}`);
    }
  }

  res.json({
    message: 'If an account exists with that email, a password reset link has been sent.',
  });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== 'string' || typeof newPassword !== 'string') {
    throw new BadRequestError('Token and new password are required');
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new ValidationError(passwordError);

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    throw new BadRequestError('Invalid or expired reset token', 'INVALID_TOKEN');
  }

  const hashed = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
    prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  res.json({ message: 'Password reset successfully' });
};

export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  const { email, username } = req.query;
  const result: { email?: boolean; username?: boolean } = {};

  if (typeof email === 'string' && email.trim()) {
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    result.email = !exists;
  }
  if (typeof username === 'string' && username.trim()) {
    const exists = await prisma.user.findUnique({ where: { username: username.trim() } });
    result.username = !exists;
  }

  res.json(result);
};

export const uploadAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  if (!req.file) throw new BadRequestError('No avatar file uploaded');

  const avatarUrl = `/uploads/${req.file.filename}`;
  res.json({ url: avatarUrl });
};

export const uploadBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  if (!req.file) throw new BadRequestError('No banner file uploaded');

  const bannerUrl = `/uploads/${req.file.filename}`;
  res.json({ url: bannerUrl });
};
