/**
 * @file config/env.js
 * @description Single source of truth for all environment variables.
 * Every module imports from here — nothing reads process.env directly.
 *
 * Validation happens at startup so a missing/empty value crashes early
 * with a clear message rather than silently breaking at runtime.
 */

import dotenv from 'dotenv';
import path   from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the server root (two levels up from config/)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the trimmed value of an env variable or throw if it is absent.
 * @param {string} key
 * @returns {string}
 */
function required(key) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`[env] Required variable "${key}" is missing or empty.`);
  return value;
}

/**
 * Return the trimmed value of an env variable, falling back to a default.
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function optional(key, fallback = '') {
  return process.env[key]?.trim() || fallback;
}

// ─── Values ───────────────────────────────────────────────────────────────────

export const NODE_ENV  = optional('NODE_ENV', 'development');
export const IS_PROD   = NODE_ENV === 'production';
export const PORT      = parseInt(optional('PORT', '5001'), 10);

export const MONGO_URI = required('MONGO_URI');

export const ADMIN_USERNAME = optional('ADMIN_USERNAME', 'admin');
export const ADMIN_PASSWORD = required('ADMIN_PASSWORD');

// In development a weak fallback is allowed; production always requires a strong secret.
export const JWT_SECRET = IS_PROD
  ? required('JWT_SECRET')
  : optional('JWT_SECRET', 'dev_only_insecure_secret_do_not_use_in_prod');
export const JWT_EXPIRES_IN = optional('JWT_EXPIRES_IN', '8h');

export const CLOUDINARY_CLOUD_NAME = optional('CLOUDINARY_CLOUD_NAME');
export const CLOUDINARY_API_KEY    = optional('CLOUDINARY_API_KEY');
export const CLOUDINARY_API_SECRET = optional('CLOUDINARY_API_SECRET');

/** Comma-separated list of allowed CORS origins (empty = allow all in dev) */
export const CORS_ORIGINS = optional('CORS_ALLOWED_ORIGINS', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const MAX_FILE_BYTES = parseInt(
  optional('UPLOAD_MAX_FILE_SIZE_BYTES', String(5 * 1024 * 1024)),
  10,
);

// ─── Production guards ────────────────────────────────────────────────────────

if (IS_PROD && JWT_SECRET === 'dev_only_insecure_secret_do_not_use_in_prod') {
  throw new Error('[env] JWT_SECRET must be set to a strong random value in production.');
}
