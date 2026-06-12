import mongoose from 'mongoose';
import { Invoice } from '../models';
import { ValidationError } from './errors';

const SEQ_PATTERN = /(\d{4})$/;

/**
 * Next sequential invoice number shared by POS checkout and manual invoices.
 * Format: INV-YYYYMM-0001 … INV-YYYYMM-9999 (one sequence per tenant per month).
 */
export async function getNextDocumentNumber(
  tenantId: mongoose.Types.ObjectId | string
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;

  const invoices = await Invoice.find({
    tenant_id: tenantId,
    invoice_number: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
    deleted_at: null,
  })
    .select('invoice_number')
    .lean();

  let maxSeq = 0;
  for (const inv of invoices) {
    const match = inv.invoice_number.match(SEQ_PATTERN);
    if (match) {
      maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
    }
  }

  if (maxSeq >= 9999) {
    throw new ValidationError(
      `Invoice number limit reached for ${prefix} (max 9999 per month)`
    );
  }

  const nextNum = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextNum}`;
}
