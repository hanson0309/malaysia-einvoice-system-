import { Job } from 'bull';
import { pool } from '../config/database';
import { MyInvoisClient, buildMyInvoisPayload } from '../services/myinvois';
import { logger } from '../utils/logger';

export async function processInvoiceSubmission(job: Job) {
  const { invoiceId, tenantId } = job.data;

  logger.info('Processing invoice submission', { invoiceId, tenantId, attempt: job.attemptsMade });

  try {
    // Build MyInvois payload
    const payload = await buildMyInvoisPayload(invoiceId, tenantId);

    // Submit to MyInvois
    const client = new MyInvoisClient(tenantId);
    const result = await client.submitInvoice(payload);

    // Update invoice with success
    await pool.query(
      `UPDATE invoices SET
        status = 'submitted',
        lhdn_submission_uid = $1,
        lhdn_validation_code = $2,
        lhdn_qr_code = $3,
        lhdn_digital_signature = $4,
        lhdn_submitted_at = NOW(),
        lhdn_error_message = NULL,
        lhdn_error_code = NULL,
        retry_count = 0,
        next_retry_at = NULL
      WHERE id = $5`,
      [
        result.submission_uid,
        result.validation_code,
        result.qr_code,
        result.digital_signature,
        invoiceId,
      ]
    );

    // Log success
    await pool.query(
      `INSERT INTO submission_logs (
        tenant_id, invoice_id, submission_type, request_payload, response_payload,
        http_status_code, status, retryable
      ) VALUES ($1, $2, 'realtime', $3, $4, 200, 'success', false)`,
      [tenantId, invoiceId, payload, result]
    );

    logger.info('Invoice submitted successfully', { invoiceId, submission_uid: result.submission_uid });

    return { success: true, submission_uid: result.submission_uid };
  } catch (error: any) {
    logger.error('Invoice submission failed', { invoiceId, error: error.message });

    const retryable = error.details?.retryable || false;
    const errorCode = error.code || 'UNKNOWN_ERROR';
    const errorMessage = error.message;

    // Log failure
    await pool.query(
      `INSERT INTO submission_logs (
        tenant_id, invoice_id, submission_type, request_payload, response_payload,
        http_status_code, status, error_code, retryable
      ) VALUES ($1, $2, 'realtime', $3, $4, $5, $6, $7)`,
      [
        tenantId,
        invoiceId,
        {},
        error.details || {},
        error.response?.status || 0,
        errorCode,
        retryable,
      ]
    );

    // Update invoice with error
    const retryCount = job.attemptsMade;
    const nextRetryAt = retryable && retryCount < 6
      ? new Date(Date.now() + Math.pow(2, retryCount) * 60000) // Exponential backoff
      : null;

    await pool.query(
      `UPDATE invoices SET
        lhdn_error_message = $1,
        lhdn_error_code = $2,
        retry_count = $3,
        next_retry_at = $4
      WHERE id = $5`,
      [errorMessage, errorCode, retryCount, nextRetryAt, invoiceId]
    );

    if (retryable && retryCount < 6) {
      throw error; // Let Bull retry
    } else {
      // Mark as permanently failed
      await pool.query(
        `UPDATE invoices SET status = 'rejected' WHERE id = $1`,
        [invoiceId]
      );
      logger.error('Invoice submission permanently failed', { invoiceId, retryCount });
    }
  }
}
