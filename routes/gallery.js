/**
 * @file routes/gallery.js
 * @description CRUD routes for the campus photo gallery.
 *
 * GET    /api/gallery           → GalleryShape[]   (public)
 * POST   /api/gallery           → GalleryShape     (admin)
 * DELETE /api/gallery/:id       → { success: true } (admin)
 */

import { Router }                     from 'express';
import Gallery                        from '../models/Gallery.js';
import { asyncHandler }               from '../utils/asyncHandler.js';
import { authMiddleware, validateId } from '../middleware/auth.js';
import { uploadLimiter }              from '../middleware/rateLimiters.js';
import { upload, handleUpload }       from '../middleware/upload.js';

const router = Router();

// ─── GET /api/gallery ─────────────────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const items = await Gallery.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  }),
);

// ─── POST /api/gallery ────────────────────────────────────────────────────────

router.post(
  '/',
  authMiddleware,
  uploadLimiter,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const imageUrl = await handleUpload(req.file);

    const item = await Gallery.create({
      title:       (req.body.title       ?? '').trim() || 'Gallery image',
      description: (req.body.description ?? '').trim(),
      category:    req.body.category || 'general',
      imageUrl:    imageUrl || (req.body.imageUrl ?? ''),
    });

    res.status(201).json(item);
  }),
);

// ─── DELETE /api/gallery/:id ──────────────────────────────────────────────────

router.delete(
  '/:id',
  authMiddleware,
  validateId,
  asyncHandler(async (req, res) => {
    const item = await Gallery.findByIdAndDelete(req.params.id).lean();
    if (!item) return res.status(404).json({ message: 'Gallery item not found.' });
    res.json({ success: true });
  }),
);

export default router;
