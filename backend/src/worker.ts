import { invoiceQueue } from './config/queue';
import { processInvoiceSubmission } from './jobs/submitInvoice';
import { logger } from './utils/logger';

invoiceQueue.process(5, processInvoiceSubmission);

invoiceQueue.on('completed', (job, result) => {
  logger.info('Job completed', { jobId: job.id, result });
});

invoiceQueue.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job?.id, error: err.message });
});

invoiceQueue.on('error', (error) => {
  logger.error('Queue error', error);
});

logger.info('Worker started, processing invoice submissions');

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker gracefully');
  await invoiceQueue.close();
  process.exit(0);
});
