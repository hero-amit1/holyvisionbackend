/**
 * @file routes/health.js
 * @description Health-check endpoint — used by load balancers and uptime monitors.
 *
 * GET /api/health
 *   → 200 { status, db, env, uptime, nodeVersion }
 */

import { Router }   from 'express';
import mongoose     from 'mongoose';
import { NODE_ENV } from '../config/env.js';

const router = Router();

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/**
 * GET /api/health
 * Public — no auth, excluded from the global rate limiter in server.js.
 */
router.get('/', (_req, res) => {
  res.json({
    status:      'ok',
    db:          DB_STATES[mongoose.connection.readyState] ?? 'unknown',
    env:         NODE_ENV,
    uptime:      Math.floor(process.uptime()),
    nodeVersion: process.version,
  });
});

export default router;
