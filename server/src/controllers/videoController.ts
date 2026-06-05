import { Request, Response } from 'express';
import path from 'path';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors';
import {
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  TAG_MAX_LENGTH,
  sanitizeString,
  slugify,
  parsePagination,
  buildPaginationResponse,
} from '../utils/validation';
import { processVideoInBackground } from '../utils/videoProcessor';

const VIDEO_INCLUDE = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  tags: {
    include: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
  _count: {
    select: {
      comments: true,
      videoLikes: true,
    },
  },
} as const;

function videoResponse(video: any) {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    videoUrl: video.videoUrl,
    hlsUrl: video.hlsUrl,
    duration: video.duration,
    views: video.views,
    likes: video.likes,
    status: video.status,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    publishedAt: video.publishedAt,
    user: video.user,
    category: video.category,
    tags: video.tags?.map((vt: any) => vt.tag) || [],
    commentCount: video._count?.comments || 0,
  };
}

function validateVideoBody(body: unknown): {
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  status: 'PUBLISHED' | 'UNLISTED' | 'PRIVATE';
} {
  if (!body || typeof body !== 'object') {
    throw new BadRequestError('Invalid request body');
  }
  const { title, description, categoryId, tags, status } = body as Record<string, unknown>;

  if (typeof title !== 'string' || !title.trim()) throw new ValidationError('Title is required');
  const trimmedTitle = title.trim();
  if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    throw new ValidationError(`Title must be at most ${TITLE_MAX_LENGTH} characters`);
  }

  const desc = description == null ? '' : typeof description === 'string' ? description : String(description);
  if (desc.length > DESCRIPTION_MAX_LENGTH) {
    throw new ValidationError(`Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);
  }

  let parsedTags: string[] = [];
  if (tags !== undefined) {
    if (!Array.isArray(tags)) throw new ValidationError('Tags must be an array');
    parsedTags = tags
      .filter((t): t is string => typeof t === 'string')
      .map(t => slugify(t))
      .filter(Boolean)
      .slice(0, 20)
      .map(t => t.substring(0, TAG_MAX_LENGTH));
  }

  const validStatuses = ['PUBLISHED', 'UNLISTED', 'PRIVATE'] as const;
  type VideoStatusType = 'PUBLISHED' | 'UNLISTED' | 'PRIVATE';
  const finalStatus: VideoStatusType =
    typeof status === 'string' && (validStatuses as readonly string[]).includes(status)
      ? (status as VideoStatusType)
      : 'PUBLISHED';

  return {
    title: trimmedTitle,
    description: sanitizeString(desc, DESCRIPTION_MAX_LENGTH),
    categoryId: typeof categoryId === 'string' && categoryId.trim() ? categoryId.trim() : null,
    tags: parsedTags,
    status: finalStatus,
  };
}

async function ensureTags(tags: string[]): Promise<string[]> {
  if (tags.length === 0) return [];
  const result: string[] = [];
  for (const tagName of tags) {
    const slug = slugify(tagName);
    const tag = await prisma.tag.upsert({
      where: { slug },
      create: { name: tagName, slug },
      update: { usageCount: { increment: 1 } },
    });
    result.push(tag.id);
  }
  return result;
}

export const uploadVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  if (!req.file) throw new BadRequestError('No video file uploaded', 'NO_FILE');

  const data = validateVideoBody(req.body);
  const videoUrl = `/uploads/${req.file.filename}`;

  const tagIds = await ensureTags(data.tags);

  const video = await prisma.video.create({
    data: {
      title: data.title,
      description: data.description,
      videoUrl,
      thumbnailUrl: 'https://placehold.co/1280x720/5D7052/FDFCF8?text=Stream.Tv',
      userId: req.user.userId,
      categoryId: data.categoryId,
      duration: 0,
      status: 'PROCESSING',
      publishedAt: null,
      tags: {
        create: tagIds.map(tagId => ({ tagId })),
      },
    },
    include: VIDEO_INCLUDE,
  });

  await prisma.user.update({
    where: { id: req.user.userId },
    data: { videoCount: { increment: 1 } },
  });

  const uploadsDir = process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? path.join('/tmp', 'uploads')
    : path.join(process.cwd(), 'uploads');

  processVideoInBackground(video.id, req.file.filename, uploadsDir, data.status).catch(err => {
    console.error(`Error launching background transcoding for ${video.id}:`, err);
  });

  res.status(201).json(videoResponse(video));
};

export const getVideos = async (req: Request, res: Response): Promise<void> => {
  const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const tagSlug = typeof req.query.tag === 'string' ? req.query.tag.trim() : '';
  const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'recent';

  const where: any = {
    status: 'PUBLISHED',
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (tagSlug) {
    where.tags = { some: { tag: { slug: tagSlug } } };
  }

  if (userId) {
    where.userId = userId;
  }

  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'popular') orderBy = { views: 'desc' };
  else if (sort === 'liked') orderBy = { likes: 'desc' };
  else if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  else if (sort === 'trending') orderBy = [{ views: 'desc' }, { createdAt: 'desc' }];

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy,
      skip,
      take,
      include: VIDEO_INCLUDE,
    }),
    prisma.video.count({ where }),
  ]);

  res.json(buildPaginationResponse(videos.map(videoResponse), total, page, pageSize));
};

export const getVideoById = async (req: AuthRequest | Request, res: Response): Promise<void> => {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new BadRequestError('Invalid video id');

  const video = await prisma.video.findUnique({
    where: { id },
    include: VIDEO_INCLUDE,
  });

  if (!video) throw new NotFoundError('Video not found');

  const currentUser = (req as AuthRequest).user;
  const isOwner = currentUser?.userId === video.userId;
  const isAdmin = currentUser?.role === 'ADMIN';

  if (video.status === 'PRIVATE' && !isOwner && !isAdmin) {
    throw new ForbiddenError('This video is private');
  }

  if (video.status === 'BLOCKED' && !isOwner && !isAdmin) {
    throw new ForbiddenError('This video has been blocked by administrators');
  }

  if (video.status === 'PROCESSING' && !isOwner && !isAdmin) {
    throw new ForbiddenError('This video is currently processing');
  }

  res.json(videoResponse(video));
};

export const updateVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new BadRequestError('Invalid video id');

  const existing = await prisma.video.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Video not found');
  if (existing.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    throw new ForbiddenError('You do not have permission to update this video');
  }

  const data = validateVideoBody(req.body);

  // Remove old tag associations and update usage counts
  const oldTags = await prisma.videoTag.findMany({
    where: { videoId: id },
    include: { tag: true },
  });
  await prisma.videoTag.deleteMany({ where: { videoId: id } });
  for (const vt of oldTags) {
    await prisma.tag.update({
      where: { id: vt.tagId },
      data: { usageCount: { decrement: 1 } },
    });
  }

  const tagIds = await ensureTags(data.tags);

  const video = await prisma.video.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      status: data.status,
      tags: {
        create: tagIds.map(tagId => ({ tagId })),
      },
    },
    include: VIDEO_INCLUDE,
  });

  res.json(videoResponse(video));
};

export const deleteVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new BadRequestError('Invalid video id');

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) throw new NotFoundError('Video not found');
  if (video.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    throw new ForbiddenError('You do not have permission to delete this video');
  }

  await prisma.video.delete({ where: { id } });
  await prisma.user.update({
    where: { id: video.userId },
    data: { videoCount: { decrement: 1 } },
  });

  res.json({ message: 'Video deleted successfully' });
};

export const recordView = async (req: AuthRequest | Request, res: Response): Promise<void> => {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new BadRequestError('Invalid video id');

  const userId = (req as AuthRequest).user?.userId;
  const watchTime = typeof req.body?.watchTime === 'number' ? Math.max(0, req.body.watchTime) : 0;
  const percentage = typeof req.body?.percentage === 'number'
    ? Math.max(0, Math.min(100, req.body.percentage))
    : 0;

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) throw new NotFoundError('Video not found');

  // Avoid view inflation: only count if at least 5 seconds watched or 25% watched
  if (watchTime < 5 && percentage < 25) {
    res.json({ counted: false });
    return;
  }

  await prisma.$transaction([
    prisma.view.create({
      data: {
        videoId: id,
        userId: userId || null,
        watchTime,
        percentage,
        ipAddress: req.ip,
        userAgent: req.header('user-agent')?.substring(0, 500),
        referrer: req.header('referer')?.substring(0, 500),
      },
    }),
    prisma.video.update({
      where: { id },
      data: { views: { increment: 1 } },
    }),
  ]);

  res.json({ counted: true });
};

export const toggleLike = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();

  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new BadRequestError('Invalid video id');

  const video = await prisma.video.findUnique({ where: { id }, select: { id: true, likes: true } });
  if (!video) throw new NotFoundError('Video not found');

  const existing = await prisma.like.findUnique({
    where: { userId_videoId: { userId: req.user.userId, videoId: id } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.video.update({ where: { id }, data: { likes: { decrement: 1 } } }),
    ]);
    res.json({ liked: false, likes: Math.max(0, video.likes - 1) });
  } else {
    const videoOwner = await prisma.video.findUnique({ where: { id }, select: { userId: true } });
    const operations: any[] = [
      prisma.like.create({ data: { userId: req.user.userId, videoId: id } }),
      prisma.video.update({ where: { id }, data: { likes: { increment: 1 } } }),
    ];

    if (videoOwner && videoOwner.userId !== req.user.userId) {
      operations.push(
        prisma.notification.create({
          data: {
            userId: videoOwner.userId,
            actorId: req.user.userId,
            type: 'NEW_LIKE',
            title: 'New like on your video',
            message: `${req.user.username} liked your video`,
            link: `/watch/${id}`,
          },
        })
      );
    }

    await prisma.$transaction(operations);
    res.json({ liked: true, likes: video.likes + 1 });
  }
};

export const getVideoLikeStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.json({ liked: false });
    return;
  }
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new BadRequestError('Invalid video id');

  const like = await prisma.like.findUnique({
    where: { userId_videoId: { userId: req.user.userId, videoId: id } },
  });

  res.json({ liked: !!like });
};

export const getRelatedVideos = async (req: Request, res: Response): Promise<void> => {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new BadRequestError('Invalid video id');

  const current = await prisma.video.findUnique({
    where: { id },
    select: { categoryId: true, userId: true, tags: { select: { tagId: true } } },
  });
  if (!current) throw new NotFoundError('Video not found');

  const tagIds = current.tags.map(t => t.tagId);

  const related = await prisma.video.findMany({
    where: {
      id: { not: id },
      status: 'PUBLISHED',
      OR: [
        ...(current.categoryId ? [{ categoryId: current.categoryId }] : []),
        ...(tagIds.length > 0 ? [{ tags: { some: { tagId: { in: tagIds } } } }] : []),
        { userId: current.userId },
      ],
    },
    orderBy: { views: 'desc' },
    take: 12,
    include: VIDEO_INCLUDE,
  });

  res.json(related.map(videoResponse));
};

export const getTrendingVideos = async (_req: Request, res: Response): Promise<void> => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const videos = await prisma.video.findMany({
    where: {
      status: 'PUBLISHED',
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: [{ views: 'desc' }, { likes: 'desc' }],
    take: 24,
    include: VIDEO_INCLUDE,
  });

  res.json(videos.map(videoResponse));
};

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { position: 'asc' },
    include: {
      _count: { select: { videos: true } },
    },
  });

  res.json(categories);
};
