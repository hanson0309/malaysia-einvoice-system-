import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AuthRequest } from './auth';

export const sendInvoiceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window per user
  message: 'Too many send requests. Please try again in a minute.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  // Rate limit by user ID from JWT token, fallback to IPv6-safe IP
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.user_id || ipKeyGenerator(req.ip || '');
  },

  // Custom error handler
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many send requests. Please try again in a minute.',
      retryAfter: 60,
    });
  },
});
