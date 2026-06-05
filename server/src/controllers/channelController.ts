import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import { parsePagination, buildPaginationResponse, BIO_MAX_LENGTH, sanitizeString, USERNAME_MAX_LENGTH } from '../utils/validation';

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  bannerUrl: true,
  isVerified: true,
  subscriberCount: true,
  videoCount: true,
  createdAt: true,
} as const;

export const getChannel = async (req: AuthRequest | Request, res: Response): Promise<void> => {
  const username = typeof req.params.username === 'string' ? req.params.username : req.params.username?.[0];
  if (!username) throw new BadRequestError('Invalid username');

  const user = await prisma.user.findUnique({
    where: { username },
    select: PUBLIC_USER_SELECT,
  });

  if (!user) throw new NotFoundError('Channel not found');

  const userId = (req as AuthRequest).user?.userId;
  let isSubscribed = false;
  if (userId && userId !== user.id) {
    const sub = await prisma.subscription.findUnique({
      where: { subscriberId_channelId: { subscriberId: userId, channelId: user.id } },
    });
    isSubscribed = !!sub;
  }

  res.json({ ...user, isSubscribed });
};

export const getChannelVideos = async (req: Request, res: Response): Promise<void> => {
  const username = typeof req.params.username === 'string' ? req.params.username : req.params.username?.[0];
  if (!username) throw new BadRequestError('Invalid username');

  const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new NotFoundError('Channel not found');

  const where: any = {
    userId: user.id,
    status: 'PUBLISHED',
  };

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { comments: true, videoLikes: true } },
      },
    }),
    prisma.video.count({ where }),
  ]);

  const formatted = videos.map(v => ({
    id: v.id,
    title: v.title,
    description: v.description,
    thumbnailUrl: v.thumbnailUrl,
    videoUrl: v.videoUrl,
    duration: v.duration,
    views: v.views,
    likes: v.likes,
    createdAt: v.createdAt,
    user: v.user,
    category: v.category,
    tags: v.tags.map(vt => vt.tag),
    commentCount: v._count.comments,
  }));

  res.json(buildPaginationResponse(formatted, total, page, pageSize));
};

export const toggleSubscribe = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const username = typeof req.params.username === 'string' ? req.params.username : req.params.username?.[0];
  if (!username) throw new BadRequestError('Invalid username');

  const channel = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!channel) throw new NotFoundError('Channel not found');
  if (channel.id === req.user.userId) {
    throw new BadRequestError('You cannot subscribe to your own channel');
  }

  const existing = await prisma.subscription.findUnique({
    where: { subscriberId_channelId: { subscriberId: req.user.userId, channelId: channel.id } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.subscription.delete({ where: { id: existing.id } }),
      prisma.user.update({ where: { id: channel.id }, data: { subscriberCount: { decrement: 1 } } }),
    ]);
    res.json({ subscribed: false, subscriberCount: Math.max(0, (await prisma.user.findUnique({ where: { id: channel.id }, select: { subscriberCount: true } }))?.subscriberCount || 0) });
  } else {
    await prisma.$transaction([
      prisma.subscription.create({
        data: { subscriberId: req.user.userId, channelId: channel.id },
      }),
      prisma.user.update({ where: { id: channel.id }, data: { subscriberCount: { increment: 1 } } }),
      prisma.notification.create({
        data: {
          userId: channel.id,
          actorId: req.user.userId,
          type: 'NEW_SUBSCRIBER',
          title: 'New subscriber',
          message: `${req.user.username} subscribed to your channel`,
          link: `/channel/${username}`,
        },
      }),
    ]);
    const newCount = (await prisma.user.findUnique({ where: { id: channel.id }, select: { subscriberCount: true } }))?.subscriberCount || 0;
    res.json({ subscribed: true, subscriberCount: newCount });
  }
};

export const getChannelStats = async (req: Request, res: Response): Promise<void> => {
  const username = typeof req.params.username === 'string' ? req.params.username : req.params.username?.[0];
  if (!username) throw new BadRequestError('Invalid username');

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, subscriberCount: true, videoCount: true, createdAt: true },
  });

  if (!user) throw new NotFoundError('Channel not found');

  const [totalViews, totalLikes] = await Promise.all([
    prisma.video.aggregate({
      where: { userId: user.id, status: 'PUBLISHED' },
      _sum: { views: true },
    }),
    prisma.video.aggregate({
      where: { userId: user.id, status: 'PUBLISHED' },
      _sum: { likes: true },
    }),
  ]);

  res.json({
    subscriberCount: user.subscriberCount,
    videoCount: user.videoCount,
    totalViews: totalViews._sum.views || 0,
    totalLikes: totalLikes._sum.likes || 0,
    joinedAt: user.createdAt,
  });
};

export const getMySubscriptions = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const subscriptions = await prisma.subscription.findMany({
    where: { subscriberId: req.user.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      channel: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
          subscriberCount: true,
          videoCount: true,
        },
      },
    },
  });

  res.json(subscriptions.map(s => s.channel));
};

export const getLikedVideos = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);

  const [likes, total] = await Promise.all([
    prisma.like.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        video: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            category: { select: { id: true, name: true, slug: true } },
            _count: { select: { comments: true, videoLikes: true } },
          },
        },
      },
    }),
    prisma.like.count({ where: { userId: req.user.userId } }),
  ]);

  const videos = likes
    .filter(l => l.video && l.video.status === 'PUBLISHED')
    .map(l => ({
      id: l.video.id,
      title: l.video.title,
      description: l.video.description,
      thumbnailUrl: l.video.thumbnailUrl,
      videoUrl: l.video.videoUrl,
      duration: l.video.duration,
      views: l.video.views,
      likes: l.video.likes,
      createdAt: l.video.createdAt,
      user: l.video.user,
      category: l.video.category,
      commentCount: l.video._count.comments,
    }));

  res.json(buildPaginationResponse(videos, total, page, pageSize));
};

export const getWatchHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);

  const [views, total] = await Promise.all([
    prisma.view.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        video: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            category: { select: { id: true, name: true, slug: true } },
            _count: { select: { comments: true, videoLikes: true } },
          },
        },
      },
    }),
    prisma.view.count({ where: { userId: req.user.userId } }),
  ]);

  const videos = views
    .filter(v => v.video && v.video.status === 'PUBLISHED')
    .map(v => ({
      id: v.video.id,
      title: v.video.title,
      description: v.video.description,
      thumbnailUrl: v.video.thumbnailUrl,
      videoUrl: v.video.videoUrl,
      duration: v.video.duration,
      views: v.video.views,
      likes: v.video.likes,
      createdAt: v.video.createdAt,
      user: v.video.user,
      category: v.video.category,
      commentCount: v.video._count.comments,
      watchedAt: v.createdAt,
      watchTime: v.watchTime,
    }));

  res.json(buildPaginationResponse(videos, total, page, pageSize));
};
