/**
 * @file routes/contact.js
 * @description Routes for public contact form and admin inquiry list.
 *
 * POST /api/contact     → { success: true, inquiry: InquiryShape }  (public)
 * GET  /api/inquiries   → InquiryShape[]                             (admin)
 */

import { Router }         from 'express';
import Inquiry            from '../models/Inquiry.js';
import { asyncHandler }   from '../utils/asyncHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { contactLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// ─── POST /api/contact ────────────────────────────────────────────────────────

router.post(
  '/contact',
  contactLimiter,
  asyncHandler(async (req, res) => {
    const { name = '', email = '', phone = '', message = '' } = req.body;

    const inquiry = await Inquiry.create({
      name:    String(name).trim(),
      email:   String(email).trim().toLowerCase(),
      phone:   String(phone).trim(),
      message: String(message).trim(),
    });

    res.status(201).json({ success: true, inquiry });
  }),
);

// ─── GET /api/inquiries ───────────────────────────────────────────────────────

router.get(
  '/inquiries',
  authMiddleware,
  asyncHandler(async (_req, res) => {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 }).lean();
    res.json(inquiries);
  }),
);

export default router;
