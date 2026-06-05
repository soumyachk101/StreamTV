import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { UnauthorizedError } from '../utils/errors';
import { parsePagination, buildPaginationResponse } from '../utils/validation';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);
  const unreadOnly = req.query.unread === 'true';

  const where: any = { userId: req.user.userId };
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        actor: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user.userId, isRead: false } }),
  ]);

  res.json({
    ...buildPaginationResponse(notifications, total, page, pageSize),
    unreadCount,
  });
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) {
    // Mark all as read
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
    return;
  }

  await prisma.notification.updateMany({
    where: { id, userId: req.user.userId },
    data: { isRead: true },
  });

  res.json({ message: 'Notification marked as read' });
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new Error('Invalid notification id');

  await prisma.notification.deleteMany({
    where: { id, userId: req.user.userId },
  });

  res.json({ message: 'Notification deleted' });
};
