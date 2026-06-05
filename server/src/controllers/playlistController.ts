import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { parsePagination, buildPaginationResponse, TITLE_MAX_LENGTH, sanitizeString } from '../utils/validation';

export const getMyPlaylists = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const playlists = await prisma.playlist.findMany({
    where: { userId: req.user.userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { items: true } },
    },
  });

  res.json(playlists);
};

export const getPlaylist = async (req: Request, res: Response): Promise<void> => {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new Error('Invalid playlist id');

  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      items: {
        orderBy: { position: 'asc' },
        include: {
          video: {
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              category: { select: { id: true, name: true, slug: true } },
              _count: { select: { comments: true, videoLikes: true } },
            },
          },
        },
      },
    },
  });

  if (!playlist) throw new NotFoundError('Playlist not found');
  if (!playlist.isPublic && playlist.userId !== (req as AuthRequest).user?.userId) {
    throw new ForbiddenError('This playlist is private');
  }

  res.json(playlist);
};

export const createPlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const { title, description, isPublic } = req.body || {};
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('Playlist title is required');
  }

  const playlist = await prisma.playlist.create({
    data: {
      title: sanitizeString(title, TITLE_MAX_LENGTH),
      description: typeof description === 'string' ? sanitizeString(description, 1000) : null,
      isPublic: isPublic !== false,
      userId: req.user.userId,
    },
  });

  res.status(201).json(playlist);
};

export const updatePlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new Error('Invalid playlist id');

  const playlist = await prisma.playlist.findUnique({ where: { id } });
  if (!playlist) throw new NotFoundError('Playlist not found');
  if (playlist.userId !== req.user.userId) {
    throw new ForbiddenError('You cannot edit this playlist');
  }

  const { title, description, isPublic } = req.body || {};
  const data: any = {};
  if (typeof title === 'string') data.title = sanitizeString(title, TITLE_MAX_LENGTH);
  if (typeof description === 'string') data.description = sanitizeString(description, 1000);
  if (typeof isPublic === 'boolean') data.isPublic = isPublic;

  const updated = await prisma.playlist.update({ where: { id }, data });
  res.json(updated);
};

export const deletePlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new Error('Invalid playlist id');

  const playlist = await prisma.playlist.findUnique({ where: { id } });
  if (!playlist) throw new NotFoundError('Playlist not found');
  if (playlist.userId !== req.user.userId) {
    throw new ForbiddenError('You cannot delete this playlist');
  }

  await prisma.playlist.delete({ where: { id } });
  res.json({ message: 'Playlist deleted' });
};

export const addVideoToPlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new Error('Invalid playlist id');
  const { videoId } = req.body || {};
  if (typeof videoId !== 'string') throw new Error('Video id is required');

  const playlist = await prisma.playlist.findUnique({ where: { id } });
  if (!playlist) throw new NotFoundError('Playlist not found');
  if (playlist.userId !== req.user.userId) {
    throw new ForbiddenError('You cannot modify this playlist');
  }

  const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
  if (!video) throw new NotFoundError('Video not found');

  const lastItem = await prisma.playlistItem.findFirst({
    where: { playlistId: id },
    orderBy: { position: 'desc' },
  });

  const item = await prisma.playlistItem.upsert({
    where: { playlistId_videoId: { playlistId: id, videoId } },
    create: {
      playlistId: id,
      videoId,
      position: (lastItem?.position || 0) + 1,
    },
    update: {},
  });

  res.status(201).json(item);
};

export const removeVideoFromPlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new Error('Invalid playlist id');
  const videoId = typeof req.params.videoId === 'string' ? req.params.videoId : req.params.videoId?.[0];
  if (!videoId) throw new Error('Video id is required');

  const playlist = await prisma.playlist.findUnique({ where: { id } });
  if (!playlist) throw new NotFoundError('Playlist not found');
  if (playlist.userId !== req.user.userId) {
    throw new ForbiddenError('You cannot modify this playlist');
  }

  await prisma.playlistItem.deleteMany({
    where: { playlistId: id, videoId },
  });

  res.json({ message: 'Video removed from playlist' });
};
