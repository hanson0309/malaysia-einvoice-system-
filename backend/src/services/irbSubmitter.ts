import { irbService } from './irbService';
import { Invoice } from '../models/Invoice';
import { Tenant, ITenant } from '../models/Tenant';

export interface IRBSubmissionResult {
  success: boolean;
  invoiceId: string;
  invoiceNumber: string;
  uuid?: string;
  status?: string;
  longId?: string;
  qrCodeUrl?: string;
  error?: string;
  details?: any;
}

/**
 * Resolve IRB credentials for a tenant.
 *
 * Strategy:
 *   1. Always prefer credentials stored on the tenant record (registered via the UI).
 *      The secret is decrypted using the tenant id + ENCRYPTION_KEY.
 *   2. Only fall back to env credentials when the tenant record has none at all
 *      (so existing test setups that rely on .env still work).
 *
 * Returns null if neither source provides usable credentials.
 */
export function resolveIRBCredentials(tenant: ITenant): { clientId: string; clientSecret: string } | null {
  const tenantId = (tenant._id as any).toString();

  if (tenant?.myinvois_client_id && tenant?.myinvois_client_secret) {
    let decrypted = '';
    try {
      decrypted = irbService.decrypt(tenant.myinvois_client_secret, tenantId);
    } catch (err: any) {
      console.error('[IRB] Failed to decrypt tenant client secret', {
        tenantId,
        error: err.message,
      });
    }

    if (decrypted) {
      console.log('[IRB] Using tenant-stored credentials', {
        tenantId,
        clientIdPreview: tenant.myinvois_client_id.slice(0, 6) + '...',
      });
      return { clientId: tenant.myinvois_client_id, clientSecret: decrypted };
    }

    // Tenant has stored creds but decrypt produced empty string -> wrong key / corrupted data.
    // Do NOT silently fall back to env, otherwise the user sees the env creds being used
    // even though they registered their own. Surface the failure instead.
    console.error('[IRB] Tenant has stored credentials but decryption returned empty', {
      tenantId,
      hint: 'ENCRYPTION_KEY may have changed since registration; re-save credentials.',
    });
    return null;
  }

  // No tenant creds stored at all -> fall back to env (legacy behaviour).
  const envCreds = irbService.getEnvironmentCredentials();
  if (envCreds) {
    console.log('[IRB] No tenant credentials found, using env fallback', { tenantId });
  }
  return envCreds;
}

/**
 * Build IRB invoice document in UBL 2.1 JSON format for MyInvois.
 * Extracted so both the HTTP route and the auto-consolidation job can reuse it.
 */
export function buildIRBDocument(invoice: any, tenant: any): any {
  const supplierIdScheme = tenant.type === 1 ? 'NRIC' : 'BRN';
  const supplierIdValue = String(tenant.company_registration_no || '').replace(/-/g, '');

  const invoiceDate = new Date(invoice.issue_date);
  const issueDate = invoiceDate.toISOString().split('T')[0];
  const issueTime = '00:00:00Z';

  return {
    _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    Invoice: [
      {
        ID: [{ _: invoice.invoice_number }],
        IssueDate: [{ _: issueDate }],
        IssueTime: [{ _: issueTime }],
        InvoiceTypeCode: [{ _: invoice.invoice_type || '01', listVersionID: '1.0' }],
        DocumentCurrencyCode: [{ _: 'MYR' }],
        Signature: [
          {
            ID: [{ _: 'urn:oasis:names:specification:ubl:signature:Invoice' }],
            SignatureMethod: [{ _: 'urn:oasis:names:specification:ubl:dsig:enveloped:xades' }],
          },
        ],
        AccountingSupplierParty: [
          {
            Party: [
              {
                IndustryClassificationCode: [
                  {
                    _: tenant.business_activity_code || '46510',
                    name: 'Wholesale of computers, computer peripheral equipment and software',
                  },
                ],
                PartyIdentification: [
                  { ID: [{ _: tenant.tin_number, schemeID: 'TIN' }] },
                  { ID: [{ _: supplierIdValue, schemeID: supplierIdScheme }] },
                ],
                PartyLegalEntity: [
                  { RegistrationName: [{ _: tenant.company_name }] },
                ],
                PostalAddress: [
                  {
                    CityName: [{ _: tenant.city || 'Kuala Lumpur' }],
                    PostalZone: [{ _: tenant.postcode || '50000' }],
                    CountrySubentityCode: [{ _: tenant.state_code || '14' }],
                    AddressLine: [
                      { Line: [{ _: tenant.address_line1 || 'Address Line 1' }] },
                    ],
                    Country: [
                      { IdentificationCode: [{ _: 'MYS', listID: '3166-1', listAgencyID: 'ISO' }] },
                    ],
                  },
                ],
                Contact: [
                  {
                    Telephone: [{ _: tenant.phone || '+60123456789' }],
                    ElectronicMail: [{ _: tenant.email || 'contact@example.com' }],
                  },
                ],
              },
            ],
          },
        ],
        AccountingCustomerParty: [
          {
            Party: [
              {
                PartyIdentification: [
                  { ID: [{ _: 'EI00000000010', schemeID: 'TIN' }] },
                  { ID: [{ _: 'NA', schemeID: 'NRIC' }] },
                ],
                PartyLegalEntity: [
                  { RegistrationName: [{ _: 'General Public' }] },
                ],
                PostalAddress: [
                  {
                    CityName: [{ _: 'NA' }],
                    PostalZone: [{ _: '00000' }],
                    CountrySubentityCode: [{ _: tenant.state_code || '14' }],
                    AddressLine: [
                      { Line: [{ _: 'NA' }] },
                    ],
                    Country: [
                      { IdentificationCode: [{ _: 'MYS', listID: '3166-1', listAgencyID: 'ISO' }] },
                    ],
                  },
                ],
                Contact: [
                  {
                    Telephone: [{ _: 'NA' }],
                    ElectronicMail: [{ _: 'NA' }],
                  },
                ],
              },
            ],
          },
        ],
        TaxTotal: [
          {
            TaxAmount: [{ _: Number(invoice.tax_amount.toFixed(2)), currencyID: 'MYR' }],
            TaxSubtotal: [
              {
                TaxableAmount: [{ _: Number(invoice.subtotal.toFixed(2)), currencyID: 'MYR' }],
                TaxAmount: [{ _: Number(invoice.tax_amount.toFixed(2)), currencyID: 'MYR' }],
                TaxCategory: [
                  {
                    ID: [{ _: '02' }],
                    TaxScheme: [
                      { ID: [{ _: 'OTH', schemeAgencyID: '6', schemeID: 'UN/ECE 5153' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        LegalMonetaryTotal: [
          {
            LineExtensionAmount: [{ _: Number(invoice.subtotal.toFixed(2)), currencyID: 'MYR' }],
            TaxExclusiveAmount: [{ _: Number(invoice.subtotal.toFixed(2)), currencyID: 'MYR' }],
            TaxInclusiveAmount: [{ _: Number(invoice.total_amount.toFixed(2)), currencyID: 'MYR' }],
            AllowanceTotalAmount: [{ _: 0, currencyID: 'MYR' }],
            PayableAmount: [{ _: Number(invoice.total_amount.toFixed(2)), currencyID: 'MYR' }],
            PayableRoundingAmount: [{ _: 0, currencyID: 'MYR' }],
          },
        ],
        InvoiceLine: invoice.items.map((item: any, index: number) => ({
          ID: [{ _: (index + 1).toString() }],
          InvoicedQuantity: [{ _: Number(item.quantity), unitCode: 'C62' }],
          LineExtensionAmount: [{ _: Number(item.line_total.toFixed(2)), currencyID: 'MYR' }],
          TaxTotal: [
            {
              TaxAmount: [
                { _: Number((item.line_total * (item.tax_rate / 100)).toFixed(2)), currencyID: 'MYR' },
              ],
              TaxSubtotal: [
                {
                  TaxableAmount: [{ _: Number(item.line_total.toFixed(2)), currencyID: 'MYR' }],
                  TaxAmount: [
                    { _: Number((item.line_total * (item.tax_rate / 100)).toFixed(2)), currencyID: 'MYR' },
                  ],
                  TaxCategory: [
                    {
                      ID: [{ _: '02' }],
                      TaxScheme: [
                        { ID: [{ _: 'OTH', schemeAgencyID: '6', schemeID: 'UN/ECE 5153' }] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          Item: [
            {
              CommodityClassification: [
                {
                  ItemClassificationCode: [
                    { _: item.classificationCode || '004', listID: 'CLASS' },
                  ],
                },
              ],
              Description: [{ _: item.description }],
            },
          ],
          Price: [
            { PriceAmount: [{ _: Number(item.unit_price.toFixed(2)), currencyID: 'MYR' }] },
          ],
          ItemPriceExtension: [
            { Amount: [{ _: Number(item.line_total.toFixed(2)), currencyID: 'MYR' }] },
          ],
        })),
      },
    ],
  };
}

/**
 * Build a SINGLE combined IRB document from multiple invoices in a batch.
 * Follows the reference server.js getConsolidatedInvoiceLine pattern:
 * - Sums all monetary amounts
 * - Uses a range invoice number as the ID (first - last)
 * - Creates ONE summary InvoiceLine with the range as the description
 * This avoids individual item NaN risks and keeps the document small.
 */
export function buildCombinedIRBDocument(
  invoices: any[],
  tenant: any
): { document: any; codeNumber: string } {
  const sorted = [...invoices].sort((a, b) =>
    String(a.invoice_number).localeCompare(String(b.invoice_number))
  );

  const subtotal = sorted.reduce((s, inv) => s + (Number(inv.subtotal) || 0), 0);
  const tax_amount = sorted.reduce((s, inv) => s + (Number(inv.tax_amount) || 0), 0);
  const total_amount = sorted.reduce((s, inv) => s + (Number(inv.total_amount) || 0), 0);

  const codeNumber =
    sorted.length > 1
      ? `${sorted[0].invoice_number} - ${sorted[sorted.length - 1].invoice_number}`
      : sorted[0].invoice_number;

  const issueDate = new Date(sorted[0].issue_date).toISOString().split('T')[0];
  const supplierIdScheme = tenant.type === 1 ? 'NRIC' : 'BRN';
  const supplierIdValue = String(tenant.company_registration_no || '').replace(/-/g, '');
  const hasRealTax = tax_amount > 0;
  const taxCategoryId = hasRealTax ? '02' : '06';

  const sub = Number(subtotal.toFixed(2));
  const tax = Number(tax_amount.toFixed(2));
  const total = Number(total_amount.toFixed(2));

  const document = {
    _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    Invoice: [
      {
        ID: [{ _: codeNumber }],
        IssueDate: [{ _: issueDate }],
        IssueTime: [{ _: '00:00:00Z' }],
        InvoiceTypeCode: [{ _: '01', listVersionID: '1.0' }],
        DocumentCurrencyCode: [{ _: 'MYR' }],
        Signature: [
          {
            ID: [{ _: 'urn:oasis:names:specification:ubl:signature:Invoice' }],
            SignatureMethod: [{ _: 'urn:oasis:names:specification:ubl:dsig:enveloped:xades' }],
          },
        ],
        AccountingSupplierParty: [
          {
            Party: [
              {
                IndustryClassificationCode: [
                  {
                    _: tenant.business_activity_code || '46510',
                    name: 'Wholesale of computers, computer peripheral equipment and software',
                  },
                ],
                PartyIdentification: [
                  { ID: [{ _: tenant.tin_number, schemeID: 'TIN' }] },
                  { ID: [{ _: supplierIdValue, schemeID: supplierIdScheme }] },
                ],
                PartyLegalEntity: [{ RegistrationName: [{ _: tenant.company_name }] }],
                PostalAddress: [
                  {
                    CityName: [{ _: tenant.city || 'Kuala Lumpur' }],
                    PostalZone: [{ _: tenant.postcode || '50000' }],
                    CountrySubentityCode: [{ _: tenant.state_code || '14' }],
                    AddressLine: [{ Line: [{ _: tenant.address_line1 || 'Address Line 1' }] }],
                    Country: [
                      { IdentificationCode: [{ _: 'MYS', listID: '3166-1', listAgencyID: 'ISO' }] },
                    ],
                  },
                ],
                Contact: [
                  {
                    Telephone: [{ _: tenant.phone || '+60123456789' }],
                    ElectronicMail: [{ _: tenant.email || 'contact@example.com' }],
                  },
                ],
              },
            ],
          },
        ],
        AccountingCustomerParty: [
          {
            Party: [
              {
                PartyIdentification: [
                  { ID: [{ _: 'EI00000000010', schemeID: 'TIN' }] },
                  { ID: [{ _: 'NA', schemeID: 'NRIC' }] },
                ],
                PartyLegalEntity: [{ RegistrationName: [{ _: 'General Public' }] }],
                PostalAddress: [
                  {
                    CityName: [{ _: 'NA' }],
                    PostalZone: [{ _: '00000' }],
                    CountrySubentityCode: [{ _: tenant.state_code || '14' }],
                    AddressLine: [{ Line: [{ _: 'NA' }] }],
                    Country: [
                      { IdentificationCode: [{ _: 'MYS', listID: '3166-1', listAgencyID: 'ISO' }] },
                    ],
                  },
                ],
                Contact: [
                  {
                    Telephone: [{ _: 'NA' }],
                    ElectronicMail: [{ _: 'NA' }],
                  },
                ],
              },
            ],
          },
        ],
        TaxTotal: [
          {
            TaxAmount: [{ _: tax, currencyID: 'MYR' }],
            TaxSubtotal: [
              {
                TaxableAmount: [{ _: sub, currencyID: 'MYR' }],
                TaxAmount: [{ _: tax, currencyID: 'MYR' }],
                TaxCategory: [
                  {
                    ID: [{ _: taxCategoryId }],
                    TaxScheme: [
                      { ID: [{ _: 'OTH', schemeAgencyID: '6', schemeID: 'UN/ECE 5153' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        LegalMonetaryTotal: [
          {
            LineExtensionAmount: [{ _: sub, currencyID: 'MYR' }],
            TaxExclusiveAmount: [{ _: sub, currencyID: 'MYR' }],
            TaxInclusiveAmount: [{ _: total, currencyID: 'MYR' }],
            AllowanceTotalAmount: [{ _: 0, currencyID: 'MYR' }],
            PayableRoundingAmount: [{ _: 0, currencyID: 'MYR' }],
            PayableAmount: [{ _: total, currencyID: 'MYR' }],
          },
        ],
        InvoiceLine: [
          {
            ID: [{ _: '1' }],
            InvoicedQuantity: [{ _: 1, unitCode: 'C62' }],
            LineExtensionAmount: [{ _: sub, currencyID: 'MYR' }],
            TaxTotal: [
              {
                TaxAmount: [{ _: tax, currencyID: 'MYR' }],
                TaxSubtotal: [
                  {
                    TaxableAmount: [{ _: sub, currencyID: 'MYR' }],
                    TaxAmount: [{ _: tax, currencyID: 'MYR' }],
                    TaxCategory: [
                      {
                        ID: [{ _: taxCategoryId }],
                        TaxScheme: [
                          { ID: [{ _: 'OTH', schemeAgencyID: '6', schemeID: 'UN/ECE 5153' }] },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
            Item: [
              {
                CommodityClassification: [
                  { ItemClassificationCode: [{ _: '004', listID: 'CLASS' }] },
                ],
                Description: [{ _: codeNumber }],
              },
            ],
            Price: [{ PriceAmount: [{ _: sub, currencyID: 'MYR' }] }],
            ItemPriceExtension: [{ Amount: [{ _: sub, currencyID: 'MYR' }] }],
          },
        ],
      },
    ],
  };

  return { document, codeNumber };
}

/**
 * Submit a CONSOLIDATED batch: combine all invoices in the batch into ONE IRB document,
 * submit it, then apply the result (uuid, status) back to every invoice in the batch.
 * Used by the manual "Submit selected invoices" flow in InvoicesPage.
 */
export async function submitConsolidatedBatchToIRB(
  invoiceIds: string[],
  tenantId: string,
  options?: { accessToken?: string; tenant?: ITenant; onInvoiceDone?: (success: boolean) => void }
): Promise<IRBSubmissionResult[]> {
  if (invoiceIds.length === 0) return [];

  const invoices = await Invoice.find({ _id: { $in: invoiceIds }, tenant_id: tenantId })
    .populate('customer_id')
    .populate('items.product_id');

  if (invoices.length === 0) {
    return invoiceIds.map((id) => ({
      success: false,
      invoiceId: id,
      invoiceNumber: '',
      error: 'Invoice not found',
    }));
  }

  const tenant = options?.tenant || (await Tenant.findById(tenantId));
  if (!tenant) {
    return invoiceIds.map((id) => ({
      success: false,
      invoiceId: id,
      invoiceNumber: '',
      error: 'Tenant not found',
    }));
  }

  let accessToken = options?.accessToken;
  if (!accessToken) {
    const creds = resolveIRBCredentials(tenant);
    if (!creds) {
      return invoiceIds.map((id) => ({
        success: false,
        invoiceId: id,
        invoiceNumber: '',
        error: 'IRB credentials not configured',
      }));
    }
    accessToken = await irbService.getToken(creds.clientId, creds.clientSecret);
  }

  const { document: combinedDoc, codeNumber } = buildCombinedIRBDocument(invoices, tenant);
  const submissionResult = await irbService.submitDocuments(
    [{ document: combinedDoc, codeNumber }],
    accessToken
  );

  const acceptedUUID = submissionResult.acceptedDocuments?.[0]?.uuid;
  const rejectionError = submissionResult.rejectedDocuments?.[0]?.error;

  const results: IRBSubmissionResult[] = [];

  if (acceptedUUID) {
    const finalStatus = await irbService.pollDocumentStatus(acceptedUUID, accessToken, 10, 5000);
    const isValid = finalStatus?.status !== 'Invalid';

    for (const inv of invoices) {
      inv.lhdn_submission_uid = acceptedUUID;
      inv.lhdn_submitted_at = new Date();
      if (finalStatus?.status === 'Valid') {
        inv.status = 'accepted';
        if (finalStatus.longId) inv.lhdn_validation_code = finalStatus.longId;
        if (finalStatus.qrCodeUrl) inv.lhdn_qr_code = finalStatus.qrCodeUrl;
      } else if (finalStatus?.status === 'Invalid') {
        inv.status = 'rejected';
        inv.lhdn_error_message = JSON.stringify(finalStatus.validationResults || {}).slice(0, 1000);
      } else {
        inv.status = 'submitted';
      }
      await inv.save();
      results.push({
        success: isValid,
        invoiceId: inv._id.toString(),
        invoiceNumber: inv.invoice_number,
        uuid: acceptedUUID,
        status: finalStatus?.status,
        longId: finalStatus?.longId,
        qrCodeUrl: finalStatus?.qrCodeUrl,
      });
      options?.onInvoiceDone?.(isValid);
    }
  } else {
    for (const inv of invoices) {
      inv.lhdn_error_message = rejectionError
        ? JSON.stringify(rejectionError).slice(0, 1000)
        : 'Not acknowledged by IRB';
      await inv.save();
      results.push({
        success: false,
        invoiceId: inv._id.toString(),
        invoiceNumber: inv.invoice_number,
        error: rejectionError ? 'Batch rejected by IRB' : 'Not in IRB submission response',
        details: rejectionError,
      });
      options?.onInvoiceDone?.(false);
    }
  }

  return results;
}

/**
 * Submit a batch of invoices to IRB in a SINGLE API call, then poll each accepted UUID
 * in parallel and persist the results.  Used by the auto-consolidation job so that
 * batchSize=20 means 20 documents per API call, not 20 individual calls.
 */
export async function submitInvoiceBatchToIRB(
  invoiceIds: string[],
  tenantId: string,
  options?: { accessToken?: string; tenant?: ITenant; onInvoiceDone?: (success: boolean) => void }
): Promise<IRBSubmissionResult[]> {
  if (invoiceIds.length === 0) return [];

  const invoices = await Invoice.find({ _id: { $in: invoiceIds }, tenant_id: tenantId })
    .populate('customer_id')
    .populate('items.product_id');

  const tenant = options?.tenant || (await Tenant.findById(tenantId));
  if (!tenant) {
    return invoiceIds.map((id) => ({
      success: false,
      invoiceId: id,
      invoiceNumber: '',
      error: 'Tenant not found',
    }));
  }

  let accessToken = options?.accessToken;
  if (!accessToken) {
    const creds = resolveIRBCredentials(tenant);
    if (!creds) {
      return invoiceIds.map((id) => ({
        success: false,
        invoiceId: id,
        invoiceNumber: '',
        error: 'IRB credentials not configured',
      }));
    }
    accessToken = await irbService.getToken(creds.clientId, creds.clientSecret);
  }

  // Build the docs array for the single API call
  const docs = invoices.map((inv) => ({
    document: buildIRBDocument(inv, tenant),
    codeNumber: inv.invoice_number,
  }));

  // Single API call with all documents in this batch
  const submissionResult = await irbService.submitDocuments(docs, accessToken);

  // Index accepted and rejected by invoiceCodeNumber for O(1) lookup
  const acceptedByCode = new Map<string, string>(); // invoiceCodeNumber -> uuid
  for (const acc of submissionResult.acceptedDocuments || []) {
    acceptedByCode.set(acc.invoiceCodeNumber, acc.uuid);
  }
  const rejectedByCode = new Map<string, any>(); // invoiceCodeNumber -> error
  for (const rej of submissionResult.rejectedDocuments || []) {
    rejectedByCode.set(rej.invoiceCodeNumber, rej.error);
  }

  // Poll all accepted UUIDs in parallel, then save
  const pollEntries = [...acceptedByCode.entries()];
  const polledResults = await Promise.all(
    pollEntries.map(async ([codeNumber, uuid]) => {
      const finalStatus = await irbService.pollDocumentStatus(uuid, accessToken as string, 10, 5000);
      return { codeNumber, uuid, finalStatus };
    })
  );
  const polledByCode = new Map(polledResults.map((p) => [p.codeNumber, p]));

  const results: IRBSubmissionResult[] = [];

  for (const inv of invoices) {
    const invId = inv._id.toString();
    const invNum = inv.invoice_number;

    if (rejectedByCode.has(invNum)) {
      const err = rejectedByCode.get(invNum);
      inv.lhdn_error_message = JSON.stringify(err).slice(0, 1000);
      await inv.save();
      const rejectedResult: IRBSubmissionResult = {
        success: false,
        invoiceId: invId,
        invoiceNumber: invNum,
        error: 'Invoice rejected by IRB',
        details: err,
      };
      results.push(rejectedResult);
      options?.onInvoiceDone?.(false);
      continue;
    }

    if (polledByCode.has(invNum)) {
      const { uuid, finalStatus } = polledByCode.get(invNum)!;
      inv.lhdn_submission_uid = uuid;
      inv.lhdn_submitted_at = new Date();

      if (finalStatus?.status === 'Valid') {
        inv.status = 'accepted';
        if (finalStatus.longId) inv.lhdn_validation_code = finalStatus.longId;
        if (finalStatus.qrCodeUrl) inv.lhdn_qr_code = finalStatus.qrCodeUrl;
      } else if (finalStatus?.status === 'Invalid') {
        inv.status = 'rejected';
        inv.lhdn_error_message = JSON.stringify(finalStatus.validationResults || {}).slice(0, 1000);
      } else {
        inv.status = 'submitted';
      }

      await inv.save();
      const polledSuccess = finalStatus?.status !== 'Invalid';
      results.push({
        success: polledSuccess,
        invoiceId: invId,
        invoiceNumber: invNum,
        uuid,
        status: finalStatus?.status,
        longId: finalStatus?.longId,
        qrCodeUrl: finalStatus?.qrCodeUrl,
        details: finalStatus?.validationResults,
      });
      options?.onInvoiceDone?.(polledSuccess);
      continue;
    }

    // Invoice was not acknowledged by IRB at all
    results.push({
      success: false,
      invoiceId: invId,
      invoiceNumber: invNum,
      error: 'Not in IRB submission response',
    });
    options?.onInvoiceDone?.(false);
  }

  // Handle IDs that were not found in the DB
  const loadedIds = new Set(invoices.map((inv) => inv._id.toString()));
  for (const id of invoiceIds) {
    if (!loadedIds.has(id)) {
      results.push({ success: false, invoiceId: id, invoiceNumber: '', error: 'Invoice not found' });
    }
  }

  return results;
}

/**
 * Submit a single invoice to IRB and update local status.
 * Reusable by both the HTTP route and the auto-consolidate job.
 */
export async function submitInvoiceToIRB(
  invoiceId: string,
  tenantId: string,
  options?: { accessToken?: string; tenant?: ITenant }
): Promise<IRBSubmissionResult> {
  const invoice = await Invoice.findOne({ _id: invoiceId, tenant_id: tenantId })
    .populate('customer_id')
    .populate('items.product_id');

  if (!invoice) {
    return { success: false, invoiceId, invoiceNumber: '', error: 'Invoice not found' };
  }

  const tenant = options?.tenant || (await Tenant.findById(tenantId));
  if (!tenant) {
    return {
      success: false,
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      error: 'Tenant not found',
    };
  }

  let accessToken = options?.accessToken;
  if (!accessToken) {
    const creds = resolveIRBCredentials(tenant);
    if (!creds) {
      return {
        success: false,
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        error: 'IRB credentials not configured',
      };
    }
    accessToken = await irbService.getToken(creds.clientId, creds.clientSecret);
  }

  // Best-effort taxpayer validation (non-blocking)
  try {
    const idType = tenant.type === 1 ? 'NRIC' : 'BRN';
    const idValue = String(tenant.company_registration_no || '').replace(/-/g, '');
    await irbService.validateTaxpayer(idType, idValue, tenant.tin_number, accessToken);
  } catch (e: any) {
    console.warn('Taxpayer validation skipped:', e.message);
  }

  const irbDocument = buildIRBDocument(invoice, tenant);

  try {
    const result = await irbService.submitDocument(
      irbDocument,
      invoice.invoice_number,
      accessToken
    );

    if (result.acceptedDocuments && result.acceptedDocuments.length > 0) {
      const uuid = result.acceptedDocuments[0].uuid;
      const finalStatus = await irbService.pollDocumentStatus(uuid, accessToken, 10, 5000);

      invoice.lhdn_submission_uid = uuid;
      invoice.lhdn_submitted_at = new Date();

      if (finalStatus.status === 'Valid') {
        invoice.status = 'accepted';
        if (finalStatus.longId) invoice.lhdn_validation_code = finalStatus.longId;
        if (finalStatus.qrCodeUrl) invoice.lhdn_qr_code = finalStatus.qrCodeUrl;
      } else if (finalStatus.status === 'Invalid') {
        invoice.status = 'rejected';
        invoice.lhdn_error_message = JSON.stringify(finalStatus.validationResults || {}).slice(0, 1000);
      } else {
        invoice.status = 'submitted';
      }

      await invoice.save();

      return {
        success: finalStatus.status !== 'Invalid',
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        uuid,
        status: finalStatus.status,
        longId: finalStatus.longId,
        qrCodeUrl: finalStatus.qrCodeUrl,
        details: finalStatus.validationResults,
      };
    }

    if (result.rejectedDocuments && result.rejectedDocuments.length > 0) {
      const err = result.rejectedDocuments[0].error;
      invoice.lhdn_error_message = JSON.stringify(err).slice(0, 1000);
      await invoice.save();
      return {
        success: false,
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        error: 'Invoice rejected by IRB',
        details: err,
      };
    }

    if (result.error) {
      return {
        success: false,
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        error: 'IRB API Error',
        details: result.error,
      };
    }

    return {
      success: false,
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      error: 'Unknown error during submission',
      details: result,
    };
  } catch (error: any) {
    return {
      success: false,
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      error: error.message || 'Submission failed',
      details: error.response?.data,
    };
  }
}
