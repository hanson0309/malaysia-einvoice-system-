import dotenv from 'dotenv';

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  MYINVOIS_BASE_URL: process.env.MYINVOIS_BASE_URL || '',
  MYINVOIS_CLIENT_ID: process.env.MYINVOIS_CLIENT_ID || '',
  MYINVOIS_CLIENT_SECRET: process.env.MYINVOIS_CLIENT_SECRET || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  // Auto-consolidation: when true, scheduler ticks every few minutes,
  // ignores day-of-month gate and per-month idempotency, and scans the
  // CURRENT month. When false (production), it only runs on day 1-7,
  // is idempotent per calendar month, and scans the PREVIOUS month.
  AUTO_CONSOLIDATE_DEBUG: String(process.env.AUTO_CONSOLIDATE_DEBUG || '').toLowerCase() === 'true',
};

// Validate required env vars
const required: Array<keyof typeof config> = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
for (const key of required) {
  if (!config[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
