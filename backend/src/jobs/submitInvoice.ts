import { Job } from 'bull';
import { MyInvoisClient } from '../services/myinvois';
import { logger } from '../utils/logger';
import { Invoice, Customer, Tenant } from '../models';
import { config } from '../config/env';

export async function processInvoiceSubmission(job: Job) {
  const { invoiceId, tenantId } = job.data;

  logger.info('Processing invoice submission', { invoiceId, tenantId, attempt: job.attemptsMade });

  try {
    // Fetch invoice with customer
    const invoice = await Invoice.findById(invoiceId).populate('customer_id');
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const customer = await Customer.findById(invoice.customer_id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Submit to MyInvois
    const client = new MyInvoisClient(tenantId, {
      clientId: tenant.myinvois_client_id || '',
      clientSecret: tenant.myinvois_client_secret || '',
      baseUrl: config.MYINVOIS_BASE_URL,
      tokenUrl: `${config.MYINVOIS_BASE_URL}/connect/token`,
    });

    const result = await client.submitInvoice(invoice, customer, tenant);

    // Check if submission was accepted
    if (result.acceptedDocuments && result.acceptedDocuments.length > 0) {
      const accepted = result.acceptedDocuments[0];

      // Update invoice with success
      invoice.status = 'submitted';
      invoice.lhdn_submission_uid = result.submissionUid;
      invoice.lhdn_validation_code = accepted.invoiceCodeNumber;
      invoice.lhdn_submitted_at = new Date();
      invoice.lhdn_error_message = undefined;
      invoice.lhdn_error_code = undefined;
      invoice.retry_count = 0;
      invoice.next_retry_at = undefined;
      await invoice.save();

      logger.info('Invoice submitted successfully', {
        invoiceId,
        submission_uid: result.submissionUid
      });

      return { success: true, submission_uid: result.submissionUid };
    } else if (result.rejectedDocuments && result.rejectedDocuments.length > 0) {
      const rejected = result.rejectedDocuments[0];
      throw new Error(`Invoice rejected: ${rejected.error.message}`);
    }

  } catch (error: any) {
    logger.error('Invoice submission failed', { invoiceId, error: error.message });

    const retryable = MyInvoisClient.isRetryable(error.code);
    const errorCode = error.code || 'UNKNOWN_ERROR';
    const errorMessage = error.message;

    // Update invoice with error
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      const retryCount = job.attemptsMade;
      const nextRetryAt = retryable && retryCount < 6
        ? new Date(Date.now() + Math.pow(2, retryCount) * 60000) // Exponential backoff
        : undefined;

      invoice.lhdn_error_message = errorMessage;
      invoice.lhdn_error_code = errorCode;
      invoice.retry_count = retryCount;
      invoice.next_retry_at = nextRetryAt;

      if (!retryable || retryCount >= 6) {
        // Mark as permanently failed
        invoice.status = 'rejected';
        logger.error('Invoice submission permanently failed', { invoiceId, retryCount });
      }

      await invoice.save();
    }

    if (retryable && job.attemptsMade < 6) {
      throw error; // Let Bull retry
    }
  }
}
