import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { parsePagination, buildPaginationResponse } from '../utils/validation';

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [users, videos, views, comments] = await Promise.all([
    prisma.user.count(),
    prisma.video.count({ where: { status: 'PUBLISHED' } }),
    prisma.view.count(),
    prisma.comment.count(),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [newUsers, newVideos, newViews] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.video.count({ where: { status: 'PUBLISHED', createdAt: { gte: sevenDaysAgo } } }),
    prisma.view.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ]);

  res.json({
    total: { users, videos, views, comments },
    last7Days: { newUsers, newVideos, newViews },
  });
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        isVerified: true,
        subscriberCount: true,
        videoCount: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json(buildPaginationResponse(users, total, page, pageSize));
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  const { role } = req.body || {};
  if (role !== 'USER' && role !== 'ADMIN') {
    throw new ValidationError('Invalid role');
  }

  const user = await prisma.user.findUnique({ where: { id: id! } });
  if (!user) throw new NotFoundError('User not found');
  if (user.id === req.user.userId && role !== 'ADMIN') {
    throw new ValidationError('You cannot demote yourself');
  }

  await prisma.user.update({ where: { id: id! }, data: { role } });
  res.json({ message: `User role updated to ${role}` });
};

export const verifyUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  const { isVerified } = req.body || {};
  await prisma.user.update({ where: { id: id! }, data: { isVerified: !!isVerified } });
  res.json({ message: `User ${isVerified ? 'verified' : 'unverified'}` });
};

export const adminDeleteVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new ValidationError('Invalid video id');

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) throw new NotFoundError('Video not found');

  await prisma.video.delete({ where: { id } });
  await prisma.user.update({
    where: { id: video.userId },
    data: { videoCount: { decrement: 1 } },
  });
  res.json({ message: 'Video deleted by admin' });
};

export const adminListVideos = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        _count: { select: { comments: true, videoLikes: true, videoViews: true } },
      },
    }),
    prisma.video.count(),
  ]);

  res.json(buildPaginationResponse(videos, total, page, pageSize));
};
