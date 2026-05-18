import { app } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { connectDB } from './config/database';
import { startAutoConsolidateScheduler } from './jobs/scheduler';

const PORT = config.PORT;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { env: config.NODE_ENV });
  });

  // Start in-process scheduler that runs auto-consolidation
  // monthly (1st-7th). Runs server-side regardless of user login state.
  startAutoConsolidateScheduler();
};

startServer();

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});
