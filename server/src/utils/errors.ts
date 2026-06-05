import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class ValidationError extends AppError {
  public readonly details?: unknown;
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', code = 'RATE_LIMITED') {
    super(message, 429, code);
  }
}

export function asyncHandler<T = unknown>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      ...(err instanceof ValidationError && err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof Error) {
    // Multer errors
    if (err.message?.includes('Only video')) {
      res.status(400).json({ message: err.message, code: 'INVALID_FILE_TYPE' });
      return;
    }
    if (err.message?.includes('File too large')) {
      res.status(413).json({ message: 'File too large. Please upload a smaller video.', code: 'FILE_TOO_LARGE' });
      return;
    }

    // Prisma unique constraint
    if ('code' in err && (err as { code?: string }).code === 'P2002') {
      const target = (err as { meta?: { target?: string[] } }).meta?.target?.join(', ') || 'field';
      res.status(409).json({ message: `A record with this ${target} already exists.`, code: 'DUPLICATE_ENTRY' });
      return;
    }

    // Prisma not found
    if ('code' in err && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ message: 'Resource not found', code: 'NOT_FOUND' });
      return;
    }

    console.error('Unhandled error:', err);
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 'INTERNAL_ERROR',
    });
    return;
  }

  console.error('Unknown error:', err);
  res.status(500).json({ message: 'Internal server error', code: 'INTERNAL_ERROR' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
}
