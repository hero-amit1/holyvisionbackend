/**
 * @file middleware/auth.js
 * @description Authentication and request-validation middleware.
 */

import jwt      from 'jsonwebtoken';
import mongoose from 'mongoose';
import { JWT_SECRET } from '../config/env.js';

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Verify the Bearer JWT and attach `req.admin` for downstream handlers.
 * Returns 401 when the token is absent/invalid, 403 when the role is wrong.
 *
 * @type {import('express').RequestHandler}
 */
export function authMiddleware(req, res, next) {
  const auth  = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden — admin access only.' });
    }

    req.admin = payload;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Session expired — please sign in again.'
        : 'Invalid or malformed token.';
    res.status(401).json({ message });
  }
}

// ─── Param validation ─────────────────────────────────────────────────────────

/**
 * Validate the `:id` route parameter as a valid MongoDB ObjectId.
 * Prevents Mongoose CastError noise from reaching the error handler.
 *
 * @type {import('express').RequestHandler}
 */
export function validateId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid resource ID.' });
  }
  next();
}
