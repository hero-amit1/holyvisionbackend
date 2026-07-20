/**
 * @file middleware/errorHandler.js
 * @description Central Express error handler.
 *
 * All errors forwarded via `next(err)` land here.
 * Every response follows a consistent JSON shape:
 *   { status: number, message: string, [errors]: string[] }
 */

import { IS_PROD, MAX_FILE_BYTES } from '../config/env.js';

/**
 * Build a structured error response body.
 *
 * @param {number}    status
 * @param {string}    message
 * @param {string[]}  [errors]
 */
function errorBody(status, message, errors) {
  const body = { status, message };
  if (errors?.length) body.errors = errors;
  return body;
}

/**
 * Global Express error-handling middleware (must have 4 parameters).
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // ── Multer ──────────────────────────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    const mb = Math.round(MAX_FILE_BYTES / 1024 / 1024);
    return res
      .status(413)
      .json(errorBody(413, `File too large — maximum allowed size is ${mb} MB.`));
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res
      .status(400)
      .json(errorBody(400, 'Unexpected file field in request.'));
  }

  // ── Unsupported media type (multer fileFilter rejection) ────────────────────
  if (err.status === 415) {
    return res.status(415).json(errorBody(415, err.message));
  }

  // ── Mongoose validation ─────────────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res
      .status(422)
      .json(errorBody(422, 'Validation failed.', errors));
  }

  // ── Mongoose duplicate key ──────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {}).join(', ') || 'field';
    return res
      .status(409)
      .json(errorBody(409, `Duplicate value for ${field}.`));
  }

  // ── CORS rejection ──────────────────────────────────────────────────────────
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json(errorBody(403, err.message));
  }

  // ── Generic fallback ────────────────────────────────────────────────────────
  const status  = err.status ?? err.statusCode ?? 500;
  const message =
    IS_PROD && status >= 500
      ? 'Internal server error.'
      : (err.message || 'An unexpected error occurred.');

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json(errorBody(status, message));
}
