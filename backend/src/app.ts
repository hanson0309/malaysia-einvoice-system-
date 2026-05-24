import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

export const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = (config.FRONTEND_URL || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    const isLocalhost = !origin || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    const isAllowed = allowedOrigins.includes(origin ?? '');
    const isVercelPreview = /^https:\/\/.*\.vercel\.app$/.test(origin ?? '');
    if (isLocalhost || isAllowed || isVercelPreview) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID'],
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);
