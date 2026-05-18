import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuthRequest } from './auth';

export const sendInvoiceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window per user
  message: 'Too many send requests. Please try again in a minute.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  // Rate limit by user ID from JWT token, fallback to IP (IPv6-safe)
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    // If user is authenticated, use user ID
    if (authReq.user?.user_id) {
      return `user:${authReq.user.user_id}`;
    }
    // Otherwise, let express-rate-limit handle IP (it's IPv6-safe by default)
    return undefined as any; // Return undefined to use default IP-based key
  },

  // Custom error handler
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many send requests. Please try again in a minute.',
      retryAfter: 60,
    });
  },
});
