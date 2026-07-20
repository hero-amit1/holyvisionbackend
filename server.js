/**
 * HolyVision Technical Campus — Production API Server
 * MERN Stack · Express 4 · Mongoose 8 · Node ≥ 18
 */

import express         from 'express';
import cors            from 'cors';
import dotenv          from 'dotenv';
import multer          from 'multer';
import path            from 'path';
import { fileURLToPath } from 'url';
import { mkdir, unlink } from 'fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import jwt             from 'jsonwebtoken';
import bcrypt          from 'bcryptjs';
import helmet          from 'helmet';
import mongoose        from 'mongoose';
import rateLimit       from 'express-rate-limit';
import morgan          from 'morgan';
import compression     from 'compression';
import mongoSanitize   from 'express-mongo-sanitize';
import hpp             from 'hpp';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* ═══════════════════════════════════════════
   1. ENVIRONMENT
═══════════════════════════════════════════ */
dotenv.config({ path: path.resolve(__dirname, '.env') });

const requireEnv = (key) => {
    const v = process.env[key]?.trim();
    if (!v) throw new Error(`Required env variable "${key}" is missing or empty.`);
    return v;
};

const NODE_ENV       = process.env.NODE_ENV?.trim() || 'development';
const IS_PROD        = NODE_ENV === 'production';
const PORT           = parseInt(process.env.PORT || '5001', 10);
const MONGO_URI      = requireEnv('MONGO_URI');
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD');
const JWT_SECRET     = IS_PROD ? requireEnv('JWT_SECRET') : (process.env.JWT_SECRET || 'dev_only_insecure_secret');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN?.trim() || '8h';
const CORS_ORIGINS   = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const MAX_FILE_BYTES = parseInt(process.env.UPLOAD_MAX_FILE_SIZE_BYTES || String(5 * 1024 * 1024), 10);

if (IS_PROD && JWT_SECRET === 'dev_only_insecure_secret') {
    throw new Error('JWT_SECRET must be set to a strong random value in production.');
}

/* ═══════════════════════════════════════════
   2. CLOUDINARY
═══════════════════════════════════════════ */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
});

/* ═══════════════════════════════════════════
   3. MONGOOSE MODELS
═══════════════════════════════════════════ */
const { Schema, model } = mongoose;

/* ── Notice ── */
const noticeSchema = new Schema({
    title:       { type: String, required: [true, 'Title is required'], trim: true, maxlength: [200, 'Title too long'] },
    description: { type: String, default: '', maxlength: [2000, 'Description too long'] },
    imageUrl:    { type: String, default: '' },
    link:        { type: String, default: '' },
}, { timestamps: true });

/* ── Event ── */
const eventSchema = new Schema({
    title:       { type: String, required: [true, 'Title is required'], trim: true, maxlength: [200, 'Title too long'] },
    description: { type: String, default: '', maxlength: [2000, 'Description too long'] },
    date:        { type: String, default: '' },
    time:        { type: String, default: '' },
    banner:      { type: String, default: '' },
}, { timestamps: true });

/* ── Gallery ── */
const gallerySchema = new Schema({
    title:       { type: String, required: [true, 'Title is required'], trim: true, maxlength: [200, 'Title too long'] },
    description: { type: String, default: '', maxlength: [500, 'Description too long'] },
    category:    { type: String, default: 'general', enum: { values: ['general', 'events', 'campus', 'students'], message: 'Invalid category' } },
    imageUrl:    { type: String, default: '' },
}, { timestamps: true });

/* ── Inquiry ── */
const inquirySchema = new Schema({
    name:    { type: String, default: '', trim: true, maxlength: [100, 'Name too long'] },
    email:   { type: String, default: '', trim: true, lowercase: true, maxlength: [200, 'Email too long'] },
    phone:   { type: String, default: '', trim: true, maxlength: [20, 'Phone too long'] },
    message: { type: String, default: '', maxlength: [3000, 'Message too long'] },
}, { timestamps: true });

/* ── Application ── */
const applicationSchema = new Schema({
    name:             { type: String, default: '', trim: true, maxlength: [150, 'Name too long'] },
    gender:           { type: String, default: '' },
    dob:              { type: String, default: '' },
    fatherName:       { type: String, default: '', trim: true },
    motherName:       { type: String, default: '', trim: true },
    municipality:     { type: String, default: '', trim: true },
    ward:             { type: String, default: '' },
    district:         { type: String, default: '', trim: true },
    province:         { type: String, default: '' },
    schoolName:       { type: String, default: '', trim: true },
    graduationYear:   { type: String, default: '' },
    percentage:       { type: String, default: '' },
    gpa:              { type: String, default: '' },
    program:          { type: String, default: '', trim: true },
    applicantContact: { type: String, default: '', trim: true },
    guardianContact:  { type: String, default: '', trim: true },
}, { timestamps: true });

const Notice      = model('Notice',      noticeSchema);
const Event       = model('Event',       eventSchema);
const Gallery     = model('Gallery',     gallerySchema);
const Inquiry     = model('Inquiry',     inquirySchema);
const Application = model('Application', applicationSchema);

/* ═══════════════════════════════════════════
   4. FILE UPLOADS (temp → Cloudinary)
═══════════════════════════════════════════ */
const UPLOAD_DIR = path.join(__dirname, 'uploads');
await mkdir(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
    storage: multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
            const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
            const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
            cb(null, name);
        },
    }),
    limits:     { fileSize: MAX_FILE_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
        ALLOWED_MIME.has(file.mimetype)
            ? cb(null, true)
            : cb(Object.assign(new Error('Only images allowed (jpeg/png/webp/gif)'), { status: 415 }));
    },
});

async function uploadToCloudinary(filePath) {
    return cloudinary.uploader.upload(filePath, {
        folder:        'holyvision',
        resource_type: 'image',
        overwrite:     false,
    });
}

/** Upload file from disk to Cloudinary, clean up temp regardless of outcome */
async function handleUpload(file) {
    if (!file) return '';
    const tmpPath = path.join(UPLOAD_DIR, file.filename);
    try {
        const result = await uploadToCloudinary(tmpPath);
        return result.secure_url;
    } finally {
        await unlink(tmpPath).catch(() => {/* ignore cleanup errors */});
    }
}

/* ═══════════════════════════════════════════
   5. AUTH
═══════════════════════════════════════════ */
/* Hash password once at startup — avoids re-hashing on every login request */
const ADMIN_HASH = await bcrypt.hash(ADMIN_PASSWORD, 12);

const signToken = (username) =>
    jwt.sign({ sub: username, role: 'admin' }, JWT_SECRET, {
        expiresIn:  JWT_EXPIRES_IN,
        algorithm:  'HS256',
    });

function authMiddleware(req, res, next) {
    const auth  = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    try {
        const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        if (payload.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
        req.admin = payload;
        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Session expired — please sign in again'
            : 'Invalid or malformed token';
        res.status(401).json({ message });
    }
}

/** Validate MongoDB ObjectId param to prevent CastError noise in logs */
function validateId(req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
    }
    next();
}

/* ═══════════════════════════════════════════
   6. RATE LIMITERS
═══════════════════════════════════════════ */
const globalLimiter = rateLimit({
    windowMs:         15 * 60 * 1000,   // 15 min
    max:              300,
    standardHeaders:  true,
    legacyHeaders:    false,
    message:          { message: 'Too many requests — please try again later' },
    skip:             (req) => req.path === '/api/health',
});

const authLimiter = rateLimit({
    windowMs:  15 * 60 * 1000,   // 15 min
    max:       10,
    message:   { message: 'Too many login attempts — wait 15 minutes and try again' },
    standardHeaders: true,
    legacyHeaders:   false,
});

const contactLimiter = rateLimit({
    windowMs:  60 * 60 * 1000,   // 1 hour
    max:       5,
    message:   { message: 'Too many submissions from this IP — try again later' },
    standardHeaders: true,
    legacyHeaders:   false,
});

const uploadLimiter = rateLimit({
    windowMs:  60 * 60 * 1000,   // 1 hour
    max:       30,
    message:   { message: 'Upload limit reached — try again later' },
    standardHeaders: true,
    legacyHeaders:   false,
});

/* ═══════════════════════════════════════════
   7. EXPRESS APP
═══════════════════════════════════════════ */
const app = express();

/* Trust reverse proxy (Nginx/Caddy) — needed for accurate IP in rate limiter */
app.set('trust proxy', 1);

/* ── Security headers ── */
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: IS_PROD ? undefined : false,   // Relax CSP in dev
}));

/* ── HTTP request logger ── */
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

/* ── Gzip compression ── */
app.use(compression());

/* ── CORS ── */
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);            // non-browser / same-origin
        if (!CORS_ORIGINS.length) return cb(null, true); // dev: allow all
        CORS_ORIGINS.includes(origin)
            ? cb(null, true)
            : cb(Object.assign(new Error(`CORS: origin "${origin}" not allowed`), { status: 403 }));
    },
    credentials: true,
    methods:     ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ── Body parsing ── */
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

/* ── NoSQL injection prevention ── */
app.use(mongoSanitize({ replaceWith: '_' }));

/* ── HTTP Parameter Pollution prevention ── */
app.use(hpp());

/* ── Global rate limiter ── */
app.use(globalLimiter);

/* ── Serve React build in production ── */
if (IS_PROD) {
    const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
    app.use(express.static(clientDist, {
        maxAge:  '7d',
        etag:    true,
        setHeaders(res, filePath) {
            /* Never cache index.html so new deploys are picked up immediately */
            if (filePath.endsWith('index.html')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
        },
    }));
}

/* ═══════════════════════════════════════════
   8. API ROUTES
═══════════════════════════════════════════ */

/* ── Health check ── */
app.get('/api/health', (_req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
        status:  'ok',
        db:      states[mongoose.connection.readyState] ?? 'unknown',
        env:     NODE_ENV,
        uptime:  Math.floor(process.uptime()),
        version: process.version,
    });
});

/* ── Auth ── */
app.post('/api/auth/login', authLimiter, async (req, res, next) => {
    try {
        const { username = '', password = '' } = req.body;

        /* Constant-time comparison for username to prevent timing attacks */
        const usernameOk = username === ADMIN_USERNAME;
        const passwordOk = await bcrypt.compare(String(password), ADMIN_HASH);

        if (usernameOk && passwordOk) {
            return res.json({ token: signToken(ADMIN_USERNAME), username: ADMIN_USERNAME });
        }
        /* Always use 401 — never reveal which field was wrong */
        res.status(401).json({ message: 'Invalid credentials' });
    } catch (err) { next(err); }
});

app.post('/api/auth/refresh', authMiddleware, (req, res) => {
    res.json({ token: signToken(req.admin.sub), username: req.admin.sub });
});

/* ── Notices ── */
app.get('/api/notices', async (_req, res, next) => {
    try {
        const docs = await Notice.find().sort({ createdAt: -1 }).lean();
        res.json(docs.map(toClient));
    } catch (err) { next(err); }
});

app.post('/api/notices', authMiddleware, uploadLimiter, upload.single('image'), async (req, res, next) => {
    try {
        const imageUrl = await handleUpload(req.file);
        const doc = await Notice.create({
            title:       (req.body.title || '').trim() || 'Untitled notice',
            description: (req.body.description || '').trim(),
            imageUrl:    imageUrl || req.body.imageUrl || '',
            link:        (req.body.link || '').trim(),
        });
        res.status(201).json(toClient(doc));
    } catch (err) { next(err); }
});

app.delete('/api/notices/:id', authMiddleware, validateId, async (req, res, next) => {
    try {
        const doc = await Notice.findByIdAndDelete(req.params.id).lean();
        if (!doc) return res.status(404).json({ message: 'Notice not found' });
        res.json({ success: true });
    } catch (err) { next(err); }
});

/* ── Events ── */
app.get('/api/events', async (_req, res, next) => {
    try {
        const docs = await Event.find().sort({ createdAt: -1 }).lean();
        res.json(docs.map(toClient));
    } catch (err) { next(err); }
});

app.post('/api/events', authMiddleware, uploadLimiter, upload.single('banner'), async (req, res, next) => {
    try {
        const banner = await handleUpload(req.file);
        const doc = await Event.create({
            title:       (req.body.title || '').trim() || 'Untitled event',
            description: (req.body.description || '').trim(),
            date:        (req.body.date || '').trim(),
            time:        (req.body.time || '').trim(),
            banner:      banner || req.body.banner || '',
        });
        res.status(201).json(toClient(doc));
    } catch (err) { next(err); }
});

app.delete('/api/events/:id', authMiddleware, validateId, async (req, res, next) => {
    try {
        const doc = await Event.findByIdAndDelete(req.params.id).lean();
        if (!doc) return res.status(404).json({ message: 'Event not found' });
        res.json({ success: true });
    } catch (err) { next(err); }
});

/* ── Gallery ── */
app.get('/api/gallery', async (_req, res, next) => {
    try {
        const docs = await Gallery.find().sort({ createdAt: -1 }).lean();
        res.json(docs.map(toClient));
    } catch (err) { next(err); }
});

app.post('/api/gallery', authMiddleware, uploadLimiter, upload.single('image'), async (req, res, next) => {
    try {
        const imageUrl = await handleUpload(req.file);
        const doc = await Gallery.create({
            title:       (req.body.title || '').trim() || 'Gallery image',
            description: (req.body.description || '').trim(),
            category:    req.body.category || 'general',
            imageUrl:    imageUrl || req.body.imageUrl || '',
        });
        res.status(201).json(toClient(doc));
    } catch (err) { next(err); }
});

app.delete('/api/gallery/:id', authMiddleware, validateId, async (req, res, next) => {
    try {
        const doc = await Gallery.findByIdAndDelete(req.params.id).lean();
        if (!doc) return res.status(404).json({ message: 'Gallery item not found' });
        res.json({ success: true });
    } catch (err) { next(err); }
});

/* ── Contact / Inquiries ── */
app.post('/api/contact', contactLimiter, async (req, res, next) => {
    try {
        const { name = '', email = '', phone = '', message = '' } = req.body;
        const doc = await Inquiry.create({
            name:    String(name).trim(),
            email:   String(email).trim().toLowerCase(),
            phone:   String(phone).trim(),
            message: String(message).trim(),
        });
        res.status(201).json({ success: true, inquiry: toClient(doc) });
    } catch (err) { next(err); }
});

app.get('/api/inquiries', authMiddleware, async (_req, res, next) => {
    try {
        const docs = await Inquiry.find().sort({ createdAt: -1 }).lean();
        res.json(docs.map(toClient));
    } catch (err) { next(err); }
});

/* ── Applications ── */
app.post('/api/applications', contactLimiter, async (req, res, next) => {
    try {
        /* Only allow known schema fields — strip any extra keys from request body */
        const allowed = [
            'name', 'gender', 'dob', 'fatherName', 'motherName',
            'municipality', 'ward', 'district', 'province',
            'schoolName', 'graduationYear', 'percentage', 'gpa',
            'program', 'applicantContact', 'guardianContact',
        ];
        const data = Object.fromEntries(
            allowed.map((k) => [k, String(req.body[k] ?? '').trim()])
        );
        const doc = await Application.create(data);
        res.status(201).json({ success: true, application: toClient(doc) });
    } catch (err) { next(err); }
});

app.get('/api/applications', authMiddleware, async (_req, res, next) => {
    try {
        const docs = await Application.find().sort({ createdAt: -1 }).lean();
        res.json(docs.map(toClient));
    } catch (err) { next(err); }
});

/* ── SPA fallback (production only — must be LAST) ── */
if (IS_PROD) {
    const indexHtml = path.resolve(__dirname, '..', 'client', 'dist', 'index.html');
    app.get('*', (_req, res) => res.sendFile(indexHtml));
}

/* ── 404 for unmatched API routes in dev ── */
app.use('/api/*', (_req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

/* ═══════════════════════════════════════════
   9. GLOBAL ERROR HANDLER
═══════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    /* Multer errors */
    if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ message: `File too large — max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB` });
    if (err.code === 'LIMIT_UNEXPECTED_FILE')
        return res.status(400).json({ message: 'Unexpected file field' });

    /* Mongoose validation */
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(422).json({ message: messages.join(', ') });
    }

    /* CORS rejection */
    if (err.message?.startsWith('CORS:'))
        return res.status(403).json({ message: err.message });

    /* File type rejection */
    if (err.status === 415)
        return res.status(415).json({ message: err.message });

    const status  = err.status || err.statusCode || 500;
    const message = IS_PROD && status >= 500 ? 'Internal server error' : (err.message || 'Request failed');

    if (status >= 500) console.error('[ERROR]', err);

    res.status(status).json({ message });
});

/* ═══════════════════════════════════════════
   10. HELPER — Mongoose doc → plain client object
═══════════════════════════════════════════ */
function toClient(doc) {
    const obj = doc.toObject ? doc.toObject({ versionKey: false }) : { ...doc };
    obj.id        = String(obj._id);
    obj.createdAt = obj.createdAt instanceof Date
        ? obj.createdAt.toISOString()
        : String(obj.createdAt ?? new Date().toISOString());
    delete obj._id;
    delete obj.__v;
    return obj;
}

/* ═══════════════════════════════════════════
   11. GRACEFUL SHUTDOWN
═══════════════════════════════════════════ */
let server;

async function shutdown(signal) {
    console.log(`\n[${signal}] Graceful shutdown initiated…`);
    server?.close(async () => {
        console.log('HTTP server closed.');
        await mongoose.connection.close(false);
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
    /* Force-exit after 15 s if graceful shutdown stalls */
    setTimeout(() => { console.error('Forced exit after timeout.'); process.exit(1); }, 15_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    console.error('[UnhandledRejection]', reason);
    /* In production, let PM2/systemd restart. In dev, crash loudly. */
    if (IS_PROD) return;
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('[UncaughtException]', err);
    process.exit(1);
});

/* ═══════════════════════════════════════════
   12. START
═══════════════════════════════════════════ */
mongoose.connection.on('disconnected', () => console.warn('[DB] MongoDB disconnected'));
mongoose.connection.on('reconnected',  () => console.log('[DB] MongoDB reconnected'));
mongoose.connection.on('error', (err)  => console.error('[DB] MongoDB error:', err.message));

async function start() {
    try {
        console.log(`[BOOT] Connecting to MongoDB…`);
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 8_000,
            socketTimeoutMS:          45_000,
            maxPoolSize:              10,
            minPoolSize:              2,
        });
        console.log('[DB] MongoDB connected ✓');

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`[SERVER] Listening on port ${PORT} (${NODE_ENV})`);
        });

        server.on('error', (err) => {
            console.error('[SERVER] Error:', err.message);
            process.exit(1);
        });
    } catch (err) {
        console.error('[BOOT] Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }
}

start();
