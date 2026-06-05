import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import env from '../config/env';

const ALLOWED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.ogv'];
const ALLOWED_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/x-m4v',
  'video/ogg',
];

const uploadsDir = process.env.VERCEL || process.env.NODE_ENV === 'production'
  ? path.join('/tmp', 'uploads')
  : path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory at: ${uploadsDir}`);
  }
} catch (error) {
  console.warn(`Failed to create uploads directory at ${uploadsDir}`, error);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.mp4';
    const hash = crypto.randomBytes(12).toString('hex');
    const timestamp = Date.now();
    cb(null, `${timestamp}-${hash}${safeExt}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIMES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (!mimeOk && !extOk) {
    cb(new Error('Only video files are allowed (MP4, WebM, MOV, AVI, MKV)'));
    return;
  }

  // Sanitize filename
  file.originalname = file.originalname
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .substring(0, 200);

  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: env.UPLOAD_MAX_SIZE,
    files: 1,
    fields: 10,
  },
  fileFilter,
});

export const thumbnailUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed for thumbnails'));
  },
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed for avatars'));
  },
});

export const bannerUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed for banners'));
  },
});
