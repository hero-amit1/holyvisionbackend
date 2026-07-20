import rateLimit from 'express-rate-limit';

/** Applied globally to all routes (health check excluded inside server.js) */
export const globalLimiter = rateLimit({
    windowMs:        15 * 60 * 1000,   // 15 min
    max:             300,
    standardHeaders: true,
    legacyHeaders:   false,
    message:         { message: 'Too many requests — please try again later' },
    skip:            (req) => req.path === '/api/health',
});

/** Login endpoint — strict to defend against brute-force */
export const authLimiter = rateLimit({
    windowMs:        15 * 60 * 1000,   // 15 min
    max:             10,
    standardHeaders: true,
    legacyHeaders:   false,
    message:         { message: 'Too many login attempts — wait 15 minutes and try again' },
});

/** Public form submissions (contact, applications) */
export const contactLimiter = rateLimit({
    windowMs:        60 * 60 * 1000,   // 1 hour
    max:             5,
    standardHeaders: true,
    legacyHeaders:   false,
    message:         { message: 'Too many submissions from this IP — try again later' },
});

/** Authenticated file uploads */
export const uploadLimiter = rateLimit({
    windowMs:        60 * 60 * 1000,   // 1 hour
    max:             30,
    standardHeaders: true,
    legacyHeaders:   false,
    message:         { message: 'Upload limit reached — try again later' },
});
