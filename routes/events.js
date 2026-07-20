/**
 * @file routes/events.js
 * @description CRUD routes for campus events.
 *
 * GET    /api/events        → EventShape[]    (public)
 * POST   /api/events        → EventShape      (admin)
 * DELETE /api/events/:id    → { success: true } (admin)
 */

import { Router }                     from 'express';
import Event                          from '../models/Event.js';
import { asyncHandler }               from '../utils/asyncHandler.js';
import { authMiddleware, validateId } from '../middleware/auth.js';
import { uploadLimiter }              from '../middleware/rateLimiters.js';
import { upload, handleUpload }       from '../middleware/upload.js';

const router = Router();

// ─── GET /api/events ──────────────────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const events = await Event.find().sort({ createdAt: -1 }).lean();
    res.json(events);
  }),
);

// ─── POST /api/events ─────────────────────────────────────────────────────────

router.post(
  '/',
  authMiddleware,
  uploadLimiter,
  upload.single('banner'),
  asyncHandler(async (req, res) => {
    const banner = await handleUpload(req.file);

    const event = await Event.create({
      title:       (req.body.title       ?? '').trim() || 'Untitled event',
      description: (req.body.description ?? '').trim(),
      date:        (req.body.date        ?? '').trim(),
      time:        (req.body.time        ?? '').trim(),
      banner:      banner || (req.body.banner ?? ''),
    });

    res.status(201).json(event);
  }),
);

// ─── DELETE /api/events/:id ───────────────────────────────────────────────────

router.delete(
  '/:id',
  authMiddleware,
  validateId,
  asyncHandler(async (req, res) => {
    const event = await Event.findByIdAndDelete(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.json({ success: true });
  }),
);

export default router;
