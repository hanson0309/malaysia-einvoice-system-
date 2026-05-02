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
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

// Validate required env vars
const required: Array<keyof typeof config> = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
for (const key of required) {
  if (!config[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
