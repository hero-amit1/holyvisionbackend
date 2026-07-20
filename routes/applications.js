/**
 * @file routes/applications.js
 * @description Routes for student admission applications.
 *
 * POST /api/applications   → { success: true, application: ApplicationShape }  (public)
 * GET  /api/applications   → ApplicationShape[]                                 (admin)
 */

import { Router }         from 'express';
import Application, { APPLICATION_FIELDS } from '../models/Application.js';
import { asyncHandler }   from '../utils/asyncHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { contactLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// ─── POST /api/applications ───────────────────────────────────────────────────

router.post(
  '/',
  contactLimiter,
  asyncHandler(async (req, res) => {
    // Whitelist — strips any keys not declared in the schema
    const data = Object.fromEntries(
      APPLICATION_FIELDS.map((key) => [key, String(req.body[key] ?? '').trim()]),
    );

    const application = await Application.create(data);
    res.status(201).json({ success: true, application });
  }),
);

// ─── GET /api/applications ────────────────────────────────────────────────────

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.program) filter.program = req.query.program;

    const applications = await Application.find(filter).sort({ createdAt: -1 }).lean();
    res.json(applications);
  }),
);

export default router;
