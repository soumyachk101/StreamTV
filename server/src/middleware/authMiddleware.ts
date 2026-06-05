import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import env from '../config/env';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: 'USER' | 'ADMIN';
    username: string;
  };
}

export interface JwtPayload {
  userId: string;
  role: 'USER' | 'ADMIN';
  username: string;
  iat?: number;
  exp?: number;
}

function extractToken(req: Request): string | null {
  const authHeader = req.header('Authorization') || req.header('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = extractToken(req);
  if (!token) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role || 'USER',
      username: decoded.username,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired', 'TOKEN_EXPIRED'));
      return;
    }
    next(new UnauthorizedError('Invalid token', 'INVALID_TOKEN'));
  }
};

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role || 'USER',
      username: decoded.username,
    };
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
};

export const requireAdmin = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  if (req.user.role !== 'ADMIN') {
    next(new ForbiddenError('Admin access required'));
    return;
  }
  next();
};

export const requireOwnership = (resourceUserIdField: string = 'userId') => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (req.user.role === 'ADMIN') return next();

    const resourceId = req.params.id || req.params.videoId;
    if (!resourceId) {
      next(new ForbiddenError('Resource ownership could not be verified'));
      return;
    }

    try {
      const resource = await (prisma as any)[getModelName(resourceUserIdField)].findUnique({
        where: { id: resourceId },
        select: { [resourceUserIdField]: true },
      });

      if (!resource || resource[resourceUserIdField] !== req.user.userId) {
        next(new ForbiddenError('You do not have access to this resource'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

function getModelName(_field: string): string {
  return 'video';
}
