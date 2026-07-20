/**
 * @file server.js
 * @description HolyVision Technical Campus — Express API entry point.
 *
 * Responsibilities (only):
 *   1. Bootstrap environment + DB connection
 *   2. Configure Express middleware stack
 *   3. Mount route modules
 *   4. Start HTTP server + graceful shutdown
 *
 * Business logic lives in routes/, models/, and middleware/.
 */

import path              from 'path';
import { fileURLToPath } from 'url';
import express           from 'express';
import cors              from 'cors';
import helmet            from 'helmet';
import morgan            from 'morgan';
import compression       from 'compression';
import mongoSanitize     from 'express-mongo-sanitize';
import hpp               from 'hpp';

// Config & DB — imported before routes so env is available immediately
import {
  PORT,
  NODE_ENV,
  IS_PROD,
  CORS_ORIGINS,
} from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import './config/cloudinary.js';  // side-effect: configures Cloudinary SDK

// Middleware
import { globalLimiter } from './middleware/rateLimiters.js';
import { errorHandler }  from './middleware/errorHandler.js';

// Routes
import healthRouter       from './routes/health.js';
import authRouter         from './routes/auth.js';
import noticesRouter      from './routes/notices.js';
import eventsRouter       from './routes/events.js';
import galleryRouter      from './routes/gallery.js';
import contactRouter      from './routes/contact.js';
import applicationsRouter from './routes/applications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();

// Trust reverse proxy (Nginx / Caddy) — required for accurate client IP in rate limiter
app.set('trust proxy', 1);

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy:     IS_PROD ? undefined : false, // relax CSP in dev
  }),
);

// ─── Observability ────────────────────────────────────────────────────────────

app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// ─── Performance ──────────────────────────────────────────────────────────────

app.use(compression());

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser clients (curl, server-to-server) and same-origin requests
      if (!origin) return cb(null, true);
      // In development (no CORS_ORIGINS configured) allow everything
      if (!CORS_ORIGINS.length) return cb(null, true);

      CORS_ORIGINS.includes(origin)
        ? cb(null, true)
        : cb(
            Object.assign(new Error(`CORS: origin "${origin}" is not allowed.`), {
              status: 403,
            }),
          );
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ─── Input sanitisation ───────────────────────────────────────────────────────

app.use(mongoSanitize({ replaceWith: '_' }));  // prevent NoSQL injection
app.use(hpp());                                 // prevent HTTP parameter pollution

// ─── Rate limiting ────────────────────────────────────────────────────────────

app.use(globalLimiter);

// ─── Static files (production) ────────────────────────────────────────────────

if (IS_PROD) {
  const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
  app.use(
    express.static(clientDist, {
      maxAge: '7d',
      etag:   true,
      setHeaders(res, filePath) {
        // Never cache the HTML shell — ensures new deploys are picked up immediately
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }),
  );
}

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api/health',       healthRouter);
app.use('/api/auth',         authRouter);
app.use('/api/notices',      noticesRouter);
app.use('/api/events',       eventsRouter);
app.use('/api/gallery',      galleryRouter);
app.use('/api',              contactRouter);        // /api/contact + /api/inquiries
app.use('/api/applications', applicationsRouter);

// ─── SPA fallback (production — must be after API routes) ─────────────────────

if (IS_PROD) {
  const indexHtml = path.resolve(__dirname, '..', 'client', 'dist', 'index.html');
  app.get('*', (_req, res) => res.sendFile(indexHtml));
}

// ─── 404 for unmatched API paths ──────────────────────────────────────────────

app.use('/api/*', (_req, res) => {
  res.status(404).json({ status: 404, message: 'API endpoint not found.' });
});

// ─── Global error handler (must be last) ─────────────────────────────────────

app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.info(`[SERVER] Listening on port ${PORT}  (${NODE_ENV})`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────

  async function shutdown(signal) {
    console.info(`\n[${signal}] Shutting down gracefully…`);

    server.close(async () => {
      console.info('[SERVER] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });

    // Force-exit if draining stalls beyond 15 s
    setTimeout(() => {
      console.error('[SERVER] Forced exit — shutdown exceeded 15 s.');
      process.exit(1);
    }, 15_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
  if (!IS_PROD) process.exit(1);
});

start().catch((err) => {
  console.error('[FATAL] Server failed to start:', err.message);
  process.exit(1);
});
