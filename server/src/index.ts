import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';

import env from './config/env';
import authRoutes from './routes/authRoutes';
import videoRoutes from './routes/videoRoutes';
import channelRoutes from './routes/channelRoutes';
import notificationRoutes from './routes/notificationRoutes';
import playlistRoutes from './routes/playlistRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler, notFoundHandler } from './utils/errors';
import { generalLimiter } from './middleware/rateLimit';
import prisma from './lib/prisma';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET is not set or too short. Set a 32+ character secret in production.');
}

const app = express();

// Trust proxy (important for rate limiting behind Vercel/load balancers)
app.set('trust proxy', 1);

// Uploads directory
const uploadsDir = process.env.VERCEL || process.env.NODE_ENV === 'production'
  ? path.join('/tmp', 'uploads')
  : path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (error) {
  console.warn('Could not create uploads directory. File uploads may fail.', error);
}

// Disable powered-by header
app.disable('x-powered-by');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // We don't serve HTML, just JSON
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.CORS_ORIGIN.length === 0 || env.CORS_ORIGIN.includes('*')) {
      return callback(null, true);
    }
    if (env.CORS_ORIGIN.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Logging
if (env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// General rate limiting
app.use('/api', generalLimiter);

// Static files for uploads
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  immutable: false,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=604800');
  },
}));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: 'Database unavailable',
    });
  }
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Stream.Tv API',
    version: '2.0.0',
    status: 'operational',
    docs: '/api',
  });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'Stream.Tv API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      videos: '/api/videos',
      channels: '/api/channels',
      playlists: '/api/playlists',
      notifications: '/api/notifications',
      admin: '/api/admin',
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Vercel requires exporting the app
export default app;

// Local development
if (require.main === module) {
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      console.error('Forced shutdown');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });
}
