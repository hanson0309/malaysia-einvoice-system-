import mongoose from 'mongoose';
import { Invoice, Tenant, Customer, ReceiptClaim, ICustomer } from '../models';
import { submitInvoiceToIRB, resolveIRBCredentials } from './irbSubmitter';
import { irbService } from './irbService';
import { ValidationError } from '../utils/errors';

const GENERAL_PUBLIC_TIN = 'EI00000000010';

export type ClaimBuyerInput = {
  claimant_type: 'individual' | 'business';
  name: string;
  email: string;
  phone: string;
  ic?: string;
  tin?: string;
  brn?: string;
  sst?: string;
  address_line1: string;
  address_line2?: string;
  postcode: string;
  city: string;
  state_code: string;
  country_code: string;
};

export async function findPosInvoice(receiptNo: string, tenantId?: string) {
  const query: Record<string, unknown> = {
    invoice_number: receiptNo,
    source: 'pos',
    deleted_at: null,
  };
  if (tenantId) {
    query.tenant_id = new mongoose.Types.ObjectId(tenantId);
  }
  return Invoice.findOne(query).sort({ created_at: -1 });
}

export function formatReceiptResponse(invoice: any, tenant: any, claim: any) {
  return {
    receipt_number: invoice.invoice_number,
    invoice_id: invoice._id,
    tenant_id: invoice.tenant_id,
    issue_date: invoice.issue_date,
    invoice_status: invoice.status,
    lhdn_uuid: invoice.lhdn_submission_uid,
    lhdn_qr_code: invoice.lhdn_qr_code,
    lhdn_validation_code: invoice.lhdn_validation_code,
    lhdn_error_message: invoice.lhdn_error_message,
    supplier: {
      company_name: tenant.company_name,
      phone: tenant.phone,
      email: tenant.email,
      address_line1: tenant.address_line1,
      address_line2: tenant.address_line2,
      postcode: tenant.postcode,
      city: tenant.city,
      state_code: tenant.state_code,
      tin_number: tenant.tin_number,
      sst_registration_no: tenant.sst_registration_no,
      company_registration_no: tenant.company_registration_no,
      business_activity_code: tenant.business_activity_code,
    },
    items: invoice.items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_type: item.tax_type,
      tax_rate: item.tax_rate,
      tax_amount: item.tax_amount,
      line_total: item.line_total,
    })),
    subtotal: invoice.subtotal,
    tax_amount: invoice.tax_amount,
    service_tax: 0,
    total_amount: invoice.total_amount,
    payment_method: invoice.payment_method,
    claim_submitted: !!claim,
    claim_status: claim?.status,
  };
}

export async function submitClaimAndEinvoice(
  receiptNo: string,
  tenantId: string | undefined,
  buyer: ClaimBuyerInput
) {
  const invoice = await findPosInvoice(receiptNo, tenantId);
  if (!invoice) {
    return { error: 'not_found' as const };
  }

  const tenant = await Tenant.findById(invoice.tenant_id);
  if (!tenant) {
    return { error: 'tenant_not_found' as const };
  }

  let existingClaim = await ReceiptClaim.findOne({ invoice_id: invoice._id });
  if (existingClaim && ['submitted', 'processing'].includes(existingClaim.status)) {
    return {
      alreadySubmitted: true,
      claim_id: existingClaim._id,
      invoice_id: invoice._id,
    };
  }

  if (existingClaim?.status === 'failed') {
    invoice.lhdn_submission_uid = undefined;
    invoice.lhdn_validation_code = undefined;
    invoice.lhdn_qr_code = undefined;
    invoice.lhdn_error_message = undefined;
    invoice.status = 'draft';
    await invoice.save();
  }

  const idType = buyer.claimant_type === 'business' ? 'BRN' : 'NRIC';
  const registrationNo =
    buyer.claimant_type === 'business'
      ? (buyer.brn || buyer.tin || 'NA')
      : (buyer.ic || 'NA');

  let buyerTin =
    buyer.claimant_type === 'business' ? buyer.tin?.trim() : undefined;

  if (buyer.claimant_type === 'individual' && buyer.ic) {
    const creds = resolveIRBCredentials(tenant);
    if (creds) {
      const token = await irbService.getToken(creds.clientId, creds.clientSecret);
      buyerTin = await irbService.getTinByNric(buyer.ic.replace(/-/g, ''), token);
    }
    if (!buyerTin || buyerTin === GENERAL_PUBLIC_TIN) {
      throw new ValidationError(
        'Could not find a registered TIN for this IC/NRIC with LHDN. Please verify your IC is registered for e-Invoice.'
      );
    }
  }

  const customer = await Customer.create({
    tenant_id: invoice.tenant_id,
    name: buyer.name,
    email: buyer.email,
    phone: buyer.phone,
    registration_no: registrationNo,
    id_type: idType as ICustomer['id_type'],
    tin_number: buyerTin || undefined,
    address_line1: buyer.address_line1,
    address_line2: buyer.address_line2,
    city: buyer.city,
    postcode: buyer.postcode,
    state_code: buyer.state_code,
    country_code: buyer.country_code || 'MY',
    customer_type: buyer.claimant_type === 'business' ? 'B2B' : 'B2C',
  });

  invoice.customer_id = customer._id;
  await invoice.save();

  const invoiceForSubmit = await Invoice.findById(invoice._id).populate('customer_id');
  if (!invoiceForSubmit) {
    return { error: 'not_found' as const };
  }

  if (existingClaim) {
    existingClaim.status = 'processing';
    await existingClaim.save();
  } else {
    existingClaim = await ReceiptClaim.create({
      tenant_id: invoice.tenant_id,
      invoice_id: invoice._id,
      receipt_number: invoice.invoice_number,
      ...buyer,
      status: 'processing',
    });
  }

  const submitResult = await submitInvoiceToIRB(
    invoiceForSubmit._id.toString(),
    invoiceForSubmit.tenant_id.toString()
  );

  existingClaim.status = submitResult.success ? 'submitted' : 'failed';
  await existingClaim.save();

  const refreshed = await Invoice.findById(invoice._id);

  return {
    success: submitResult.success,
    claim_id: existingClaim._id,
    claim_status: existingClaim.status,
    submission: submitResult,
    invoice: refreshed,
  };
}

export async function getReceiptSubmissionStatus(receiptNo: string, tenantId?: string) {
  const invoice = await findPosInvoice(receiptNo, tenantId);
  if (!invoice) {
    return { error: 'not_found' as const };
  }

  const tenant = await Tenant.findById(invoice.tenant_id);
  const claim = await ReceiptClaim.findOne({ invoice_id: invoice._id }).sort({
    created_at: -1,
  });

  let documentStatus: Record<string, unknown> | null = null;

  if (invoice.lhdn_submission_uid && tenant) {
    try {
      const creds = resolveIRBCredentials(tenant);
      if (creds) {
        const token = await irbService.getToken(creds.clientId, creds.clientSecret);
        documentStatus = await irbService.pollDocumentStatus(
          invoice.lhdn_submission_uid,
          token,
          1,
          0
        );
      }
    } catch {
      // use stored invoice fields
    }
  }

  const status =
    documentStatus?.status ||
    (invoice.status === 'accepted'
      ? 'Valid'
      : invoice.status === 'rejected'
        ? 'Invalid'
        : invoice.lhdn_submission_uid
          ? 'Submitted'
          : '');

  return {
    receipt_number: invoice.invoice_number,
    invoice_status: invoice.status,
    claim_status: claim?.status,
    uuid: invoice.lhdn_submission_uid,
    long_id: invoice.lhdn_validation_code,
    qr_code_url: invoice.lhdn_qr_code,
    status,
    validation_results: documentStatus?.validationResults,
    error_message: invoice.lhdn_error_message,
    receipt: formatReceiptResponse(invoice, tenant!, claim),
  };
}
