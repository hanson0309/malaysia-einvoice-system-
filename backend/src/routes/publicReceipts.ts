import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError } from '../utils/errors';
import { Tenant, ReceiptClaim } from '../models';
import {
  findPosInvoice,
  formatReceiptResponse,
  submitClaimAndEinvoice,
  getReceiptSubmissionStatus,
  ClaimBuyerInput,
} from '../services/publicReceiptClaimService';
import { normalizeMalaysianStateCode } from '../utils/malaysianStates';

const router = Router();

const optionalString = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (value == null ? '' : value))
    .pipe(z.string().max(max));

const claimSchema = z.object({
  claimant_type: z.enum(['individual', 'business']),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  ic: optionalString(20),
  tin: optionalString(20),
  brn: optionalString(50),
  sst: optionalString(50),
  address_line1: z.string().min(1).max(200),
  address_line2: optionalString(200),
  postcode: z.string().min(1).max(10),
  city: z.string().min(1).max(100),
  state_code: z.string().min(1).max(50),
  country_code: z.string().length(2).default('MY'),
});

function toClaimBuyerInput(parsed: z.infer<typeof claimSchema>): ClaimBuyerInput {
  return {
    claimant_type: parsed.claimant_type,
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    ic: parsed.ic || undefined,
    tin: parsed.tin || undefined,
    brn: parsed.brn || undefined,
    sst: parsed.sst || undefined,
    address_line1: parsed.address_line1,
    address_line2: parsed.address_line2 || undefined,
    postcode: parsed.postcode,
    city: parsed.city,
    state_code: normalizeMalaysianStateCode(parsed.state_code),
    country_code: parsed.country_code,
  };
}

router.get('/:receiptNo/status', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant as string | undefined;
    const result = await getReceiptSubmissionStatus(req.params.receiptNo, tenantId);
    if ('error' in result && result.error === 'not_found') {
      throw new NotFoundError('Receipt not found');
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:receiptNo', async (req, res, next) => {
  try {
    const { receiptNo } = req.params;
    const tenantId = req.query.tenant as string | undefined;

    const invoice = await findPosInvoice(receiptNo, tenantId);
    if (!invoice) {
      throw new NotFoundError('Receipt not found');
    }

    const tenant = await Tenant.findById(invoice.tenant_id);
    if (!tenant) {
      throw new NotFoundError('Store not found');
    }

    const existingClaim = await ReceiptClaim.findOne({
      invoice_id: invoice._id,
    }).sort({ created_at: -1 });

    res.json(formatReceiptResponse(invoice, tenant, existingClaim));
  } catch (error) {
    next(error);
  }
});

router.post('/:receiptNo/claim', async (req, res, next) => {
  try {
    const { receiptNo } = req.params;
    const tenantId = req.query.tenant as string | undefined;
    const parsed = claimSchema.parse(req.body);
    const data = toClaimBuyerInput(parsed);

    if (data.claimant_type === 'individual' && !data.ic) {
      throw new ValidationError('IC is required for individual claimant');
    }
    if (data.claimant_type === 'business' && !data.tin) {
      throw new ValidationError('TIN is required for business claimant');
    }
    if (data.claimant_type === 'business' && !data.brn) {
      throw new ValidationError('Company registration no (BRN) is required for business');
    }

    const result = await submitClaimAndEinvoice(receiptNo, tenantId, data);

    if ('error' in result) {
      if (result.error === 'not_found') throw new NotFoundError('Receipt not found');
      throw new NotFoundError('Store not found');
    }

    if (result.alreadySubmitted) {
      const status = await getReceiptSubmissionStatus(receiptNo, tenantId);
      return res.json({
        success: true,
        message: 'E-invoice already submitted for this receipt',
        ...status,
      });
    }

    const tenant = await Tenant.findById(result.invoice!.tenant_id);
    const claim = await ReceiptClaim.findById(result.claim_id);

    res.status(201).json({
      success: result.success,
      message: result.success
        ? 'E-invoice submitted to LHDN'
        : result.submission?.error || 'Submission failed',
      claim_id: result.claim_id,
      claim_status: result.claim_status,
      submission: result.submission,
      receipt: formatReceiptResponse(result.invoice, tenant!, claim),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
