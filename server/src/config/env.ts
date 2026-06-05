interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string[];
  UPLOAD_MAX_SIZE: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
  BCRYPT_ROUNDS: number;
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('CORS_ORIGIN is not set in production. Defaulting to no allowed origins.');
      return [];
    }
    return ['http://localhost:3000', 'http://localhost:3001'];
  }
  return value.split(',').map(o => o.trim()).filter(Boolean);
}

function getEnv(): EnvConfig {
  const NODE_ENV = (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development';
  const PORT = parseInt(process.env.PORT || '5000', 10);
  const DATABASE_URL = process.env.DATABASE_URL;
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  const CORS_ORIGIN = parseCorsOrigins(process.env.CORS_ORIGIN);
  const UPLOAD_MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE || '524288000', 10); // 500MB
  const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15min
  const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '200', 10);
  const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

  const errors: string[] = [];
  if (!DATABASE_URL) errors.push('DATABASE_URL is required');
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  if (errors.length > 0) {
    console.error('Environment configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    if (NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration');
    }
  }

  return {
    NODE_ENV,
    PORT,
    DATABASE_URL: DATABASE_URL || '',
    JWT_SECRET: JWT_SECRET || 'development-insecure-secret-replace-in-production-32chars',
    JWT_EXPIRES_IN,
    CORS_ORIGIN,
    UPLOAD_MAX_SIZE,
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX,
    BCRYPT_ROUNDS,
  };
}

export const env = getEnv();
export default env;
