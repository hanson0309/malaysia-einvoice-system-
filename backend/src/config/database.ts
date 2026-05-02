import mongoose from 'mongoose';
import { config } from './env';
import { logger } from '../utils/logger';

export const connectDB = async () => {
  try {
    // Workaround for Windows DNS SRV resolution issue
    // Use standard connection format instead of SRV
    let connectionString = config.DATABASE_URL as string;

    if (connectionString.includes('mongodb+srv://')) {
      // Replace SRV format with standard format using known hosts
      connectionString = connectionString
        .replace('mongodb+srv://', 'mongodb://')
        .replace('@einvoice.dlmpm3q.mongodb.net', '@ac-08roygu-shard-00-00.dlmpm3q.mongodb.net:27017,ac-08roygu-shard-00-01.dlmpm3q.mongodb.net:27017,ac-08roygu-shard-00-02.dlmpm3q.mongodb.net:27017')
        .replace('?', '?ssl=true&authSource=admin&');

      logger.info('Using standard MongoDB connection format (Windows DNS workaround)');
    }

    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    logger.warn('Starting server without database connection. Some features may not work.');
  }
};

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected');
});

export default mongoose;
