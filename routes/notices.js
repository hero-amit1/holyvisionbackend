/**
 * @file routes/notices.js
 * @description CRUD routes for campus notices/announcements.
 *
 * GET    /api/notices        → NoticeShape[]   (public)
 * POST   /api/notices        → NoticeShape     (admin)
 * DELETE /api/notices/:id    → { success: true } (admin)
 */

import { Router }                     from 'express';
import Notice                         from '../models/Notice.js';
import { asyncHandler }               from '../utils/asyncHandler.js';
import { authMiddleware, validateId } from '../middleware/auth.js';
import { uploadLimiter }              from '../middleware/rateLimiters.js';
import { upload, handleUpload }       from '../middleware/upload.js';

const router = Router();

// ─── GET /api/notices ─────────────────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const notices = await Notice.find().sort({ createdAt: -1 }).lean();
    res.json(notices);
  }),
);

// ─── POST /api/notices ────────────────────────────────────────────────────────

router.post(
  '/',
  authMiddleware,
  uploadLimiter,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const imageUrl = await handleUpload(req.file);

    const notice = await Notice.create({
      title:       (req.body.title       ?? '').trim() || 'Untitled notice',
      description: (req.body.description ?? '').trim(),
      imageUrl:    imageUrl || (req.body.imageUrl ?? ''),
      link:        (req.body.link        ?? '').trim(),
    });

    res.status(201).json(notice);
  }),
);

// ─── DELETE /api/notices/:id ──────────────────────────────────────────────────

router.delete(
  '/:id',
  authMiddleware,
  validateId,
  asyncHandler(async (req, res) => {
    const notice = await Notice.findByIdAndDelete(req.params.id).lean();
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });
    res.json({ success: true });
  }),
);

export default router;
