/**
 * @file middleware/upload.js
 * @description Multer configuration for temporary disk storage and
 * a helper that streams the temp file to Cloudinary then cleans up.
 *
 * Flow: multipart/form-data → multer → /uploads/<tmp> → Cloudinary → delete tmp
 */

import { randomBytes }       from 'crypto';
import { mkdir, unlink }     from 'fs/promises';
import path                  from 'path';
import { fileURLToPath }     from 'url';
import multer                from 'multer';
import cloudinary            from '../config/cloudinary.js';
import { MAX_FILE_BYTES }    from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Upload directory ─────────────────────────────────────────────────────────

/** Absolute path to the temporary upload directory (server/uploads/) */
export const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

// Ensure the directory exists before any request arrives
await mkdir(UPLOAD_DIR, { recursive: true });

// ─── MIME allowlist ───────────────────────────────────────────────────────────

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// ─── Multer instance ──────────────────────────────────────────────────────────

/**
 * Multer middleware configured for single-image uploads.
 * Use `.single('image')` or `.single('banner')` in your route.
 */
export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename(_req, file, cb) {
      // crypto.randomBytes is more collision-resistant than Math.random
      const uid  = randomBytes(8).toString('hex');
      const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${uid}${ext}`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_BYTES,
    files:    1,
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        Object.assign(
          new Error('Only images are allowed (jpeg · png · webp · gif).'),
          { status: 415 },
        ),
      );
    }
  },
});

// ─── Cloudinary helper ────────────────────────────────────────────────────────

/**
 * Upload a multer temp file to Cloudinary and delete the local copy
 * regardless of whether the upload succeeds or fails.
 *
 * @param {Express.Multer.File | undefined} file - File object from multer, or undefined
 * @returns {Promise<string>} Cloudinary `secure_url`, or `''` when no file was provided
 */
export async function handleUpload(file) {
  if (!file) return '';

  const tmpPath = path.join(UPLOAD_DIR, file.filename);

  try {
    const result = await cloudinary.uploader.upload(tmpPath, {
      folder:        'holyvision',
      resource_type: 'image',
      overwrite:     false,
    });
    return result.secure_url;
  } finally {
    // Always remove the temp file — even if Cloudinary threw
    await unlink(tmpPath).catch((e) =>
      console.warn(`[upload] Could not delete temp file ${tmpPath}:`, e.message),
    );
  }
}
