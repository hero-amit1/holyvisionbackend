/**
 * @file routes/auth.js
 * @description Authentication routes — login and token refresh.
 *
 * POST /api/auth/login    → { token, username }
 * POST /api/auth/refresh  → { token, username }  (requires valid JWT)
 */

import { Router }        from 'express';
import bcrypt            from 'bcryptjs';
import jwt               from 'jsonwebtoken';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { authLimiter }   from '../middleware/rateLimiters.js';
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  JWT_SECRET,
  JWT_EXPIRES_IN,
} from '../config/env.js';

const router = Router();

// ─── One-time setup ───────────────────────────────────────────────────────────

/**
 * Hash the admin password once at module load — avoids re-hashing on every
 * login request and keeps the plaintext password out of the request cycle.
 */
const ADMIN_HASH = await bcrypt.hash(ADMIN_PASSWORD, 12);

/**
 * Sign a JWT for the given username.
 * @param {string} username
 * @returns {string}
 */
function signToken(username) {
  return jwt.sign(
    { sub: username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' },
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Rate-limited. Constant-time comparison prevents username enumeration.
 */
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { username = '', password = '' } = req.body;

    // Run both checks regardless of username result to prevent timing attacks
    const usernameOk = username === ADMIN_USERNAME;
    const passwordOk = await bcrypt.compare(String(password), ADMIN_HASH);

    if (usernameOk && passwordOk) {
      return res.json({ token: signToken(ADMIN_USERNAME), username: ADMIN_USERNAME });
    }

    // Always 401 — never hint which field was wrong
    res.status(401).json({ message: 'Invalid credentials.' });
  }),
);

/**
 * POST /api/auth/refresh
 * Issues a fresh token for an already-authenticated admin.
 */
router.post('/refresh', authMiddleware, (req, res) => {
  res.json({ token: signToken(req.admin.sub), username: req.admin.sub });
});

export default router;
