import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors';
import { COMMENT_MAX_LENGTH, parsePagination, sanitizeString } from '../utils/validation';

const COMMENT_INCLUDE = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
    },
  },
  _count: {
    select: { replies: true, likes: true } as any,
  },
} as any;

export const getComments = async (req: Request, res: Response): Promise<void> => {
  const videoId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!videoId) throw new BadRequestError('Invalid video id');

  const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);

  const where: any = { videoId, parentId: null, isHidden: false };

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: {
        ...COMMENT_INCLUDE,
        replies: {
          where: { isHidden: false },
          orderBy: { createdAt: 'asc' },
          take: 3,
          include: COMMENT_INCLUDE,
        },
      },
    }),
    prisma.comment.count({ where }),
  ]);

  res.json({
    items: comments,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  });
};

export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const videoId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!videoId) throw new BadRequestError('Invalid video id');

  const { content, parentId } = req.body || {};
  if (typeof content !== 'string' || !content.trim()) {
    throw new ValidationError('Comment content is required');
  }
  if (content.length > COMMENT_MAX_LENGTH) {
    throw new ValidationError(`Comment must be at most ${COMMENT_MAX_LENGTH} characters`);
  }

  const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true, userId: true } });
  if (!video) throw new NotFoundError('Video not found');

  if (parentId) {
    if (typeof parentId !== 'string') throw new BadRequestError('Invalid parent id');
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent || parent.videoId !== videoId) throw new BadRequestError('Invalid parent comment');
  }

  const comment = await prisma.comment.create({
    data: {
      content: sanitizeString(content, COMMENT_MAX_LENGTH),
      userId: req.user.userId,
      videoId,
      parentId: parentId || null,
    },
    include: COMMENT_INCLUDE,
  });

  // Notify video owner
  if (video.userId !== req.user.userId) {
    await prisma.notification.create({
      data: {
        userId: video.userId,
        actorId: req.user.userId,
        type: 'NEW_COMMENT',
        title: 'New comment',
        message: `${req.user.username} commented on your video`,
        link: `/watch/${videoId}#comment-${comment.id}`,
      },
    });
  }

  res.status(201).json(comment);
};

export const updateComment = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.commentId === 'string' ? req.params.commentId : req.params.commentId?.[0];
  if (!id) throw new BadRequestError('Invalid comment id');

  const { content } = req.body || {};
  if (typeof content !== 'string' || !content.trim()) {
    throw new ValidationError('Comment content is required');
  }

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) throw new NotFoundError('Comment not found');
  if (comment.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    throw new ForbiddenError('You cannot edit this comment');
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { content: sanitizeString(content, COMMENT_MAX_LENGTH), isEdited: true },
    include: COMMENT_INCLUDE,
  });

  res.json(updated);
};

export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.commentId === 'string' ? req.params.commentId : req.params.commentId?.[0];
  if (!id) throw new BadRequestError('Invalid comment id');

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) throw new NotFoundError('Comment not found');
  if (comment.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    throw new ForbiddenError('You cannot delete this comment');
  }

  await prisma.comment.delete({ where: { id } });
  res.json({ message: 'Comment deleted' });
};
