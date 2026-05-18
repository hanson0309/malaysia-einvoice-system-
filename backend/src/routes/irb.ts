import { Router, Response } from 'express';
import { irbService } from '../services/irbService';
import { submitInvoiceToIRB, submitInvoiceBatchToIRB, submitConsolidatedBatchToIRB, resolveIRBCredentials } from '../services/irbSubmitter';
import { runAutoConsolidationForTenant } from '../jobs/autoConsolidate';
import { progressStore } from '../utils/progressStore';
import { Invoice } from '../models/Invoice';
import { Tenant } from '../models/Tenant';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';

const router = Router();

// Apply authentication and tenant context to all routes
router.use(authenticateJWT);
router.use(extractTenant);

/**
 * POST /api/v1/irb/submit/:invoiceId
 * 提交单个发票到 IRB
 */
router.post('/submit/:invoiceId', async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID not found' });
    }

    const result = await submitInvoiceToIRB(String(invoiceId), String(tenantId));

    if (!result.success && result.error === 'Invoice not found') {
      return res.status(404).json({ error: result.error });
    }
    if (!result.success && result.error === 'Tenant not found') {
      return res.status(404).json({ error: result.error });
    }
    if (!result.success && result.error === 'IRB credentials not configured') {
      return res.status(400).json({
        error: 'IRB credentials not configured. Please add credentials to tenant or environment variables.',
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
      });
    }

    return res.json({
      success: true,
      uuid: result.uuid,
      status: result.status,
      longId: result.longId,
      qrCodeUrl: result.qrCodeUrl,
      validationResults: result.details,
      message:
        result.status === 'Valid'
          ? 'Invoice submitted and validated successfully'
          : result.status === 'Invalid'
          ? 'Invoice submitted but validation failed'
          : 'Invoice submitted, validation pending',
    });
  } catch (error: any) {
    console.error('IRB submission error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/irb/status/:invoiceId
 * 查询发票在 IRB 的状态
 */
router.get('/status/:invoiceId', async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID not found' });
    }

    const invoice = await Invoice.findOne({ _id: invoiceId, tenant_id: tenantId });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.lhdn_submission_uid) {
      return res.json({
        status: 'not_submitted',
        message: 'Invoice has not been submitted to IRB'
      });
    }

    // 获取租户信息
    const tenant = await Tenant.findById(tenantId);

    // Get credentials: try tenant first, then environment variables
    let clientId: string;
    let clientSecret: string;

    if (tenant?.myinvois_client_id && tenant?.myinvois_client_secret) {
      // Use tenant-specific credentials
      clientId = tenant.myinvois_client_id;
      clientSecret = irbService.decrypt(
        tenant.myinvois_client_secret,
        tenantId.toString()
      );
    } else {
      // Fall back to environment variables
      const envCreds = irbService.getEnvironmentCredentials();
      if (!envCreds) {
        return res.status(400).json({
          error: 'IRB credentials not configured. Please add credentials to tenant or environment variables.'
        });
      }
      clientId = envCreds.clientId;
      clientSecret = envCreds.clientSecret;
    }

    const accessToken = await irbService.getToken(
      clientId,
      clientSecret
    );

    // 查询 IRB 状态
    const details = await irbService.getDocumentDetails(
      invoice.lhdn_submission_uid,
      accessToken
    );

    // 更新本地状态
    if (details.status === 'Valid') {
      invoice.status = 'accepted';
      await invoice.save();
    } else if (details.status === 'Invalid') {
      invoice.status = 'rejected';
      await invoice.save();
    }

    return res.json({
      status: details.status,
      uuid: invoice.lhdn_submission_uid,
      details: details
    });

  } catch (error: any) {
    console.error('IRB status check error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/irb/tin-lookup
 * 根据 NRIC 查询 TIN
 */
router.post('/tin-lookup', async (req: AuthRequest, res: Response) => {
  try {
    const { nric } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID not found' });
    }

    if (!nric) {
      return res.status(400).json({ error: 'NRIC is required' });
    }

    const tenant = await Tenant.findById(tenantId);

    // Get credentials: try tenant first, then environment variables
    let clientId: string;
    let clientSecret: string;

    if (tenant?.myinvois_client_id && tenant?.myinvois_client_secret) {
      // Use tenant-specific credentials
      clientId = tenant.myinvois_client_id;
      clientSecret = irbService.decrypt(
        tenant.myinvois_client_secret,
        tenantId.toString()
      );
    } else {
      // Fall back to environment variables
      const envCreds = irbService.getEnvironmentCredentials();
      if (!envCreds) {
        return res.status(400).json({
          error: 'IRB credentials not configured. Please add credentials to tenant or environment variables.'
        });
      }
      clientId = envCreds.clientId;
      clientSecret = envCreds.clientSecret;
    }

    const accessToken = await irbService.getToken(
      clientId,
      clientSecret
    );

    const tin = await irbService.getTinByNric(nric, accessToken);

    return res.json({
      nric: nric,
      tin: tin
    });

  } catch (error: any) {
    console.error('TIN lookup error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/irb/auto-consolidate/settings
 * Returns the current tenant's auto-consolidation configuration.
 */
router.get('/auto-consolidate/settings', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID not found' });

    const tenant = await Tenant.findById(tenantId).select(
      'auto_consolidate_enabled auto_consolidate_day auto_consolidate_batch_size auto_consolidate_last_run_at auto_consolidate_last_status'
    );
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    return res.json({
      enabled: !!tenant.auto_consolidate_enabled,
      day: tenant.auto_consolidate_day || 5,
      batchSize: tenant.auto_consolidate_batch_size || 20,
      lastRunAt: tenant.auto_consolidate_last_run_at || null,
      lastStatus: tenant.auto_consolidate_last_status || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * PUT /api/v1/irb/auto-consolidate/settings
 * Update auto-consolidation configuration for the current tenant.
 */
router.put('/auto-consolidate/settings', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID not found' });

    const { enabled, day, batchSize } = req.body || {};
    const update: any = {};
    if (typeof enabled === 'boolean') update.auto_consolidate_enabled = enabled;
    if (typeof day === 'number' && day >= 1 && day <= 7) update.auto_consolidate_day = day;
    if (typeof batchSize === 'number' && batchSize >= 1 && batchSize <= 100) {
      update.auto_consolidate_batch_size = batchSize;
    }

    const tenant = await Tenant.findByIdAndUpdate(tenantId, { $set: update }, { new: true }).select(
      'auto_consolidate_enabled auto_consolidate_day auto_consolidate_batch_size auto_consolidate_last_run_at auto_consolidate_last_status'
    );
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    return res.json({
      enabled: !!tenant.auto_consolidate_enabled,
      day: tenant.auto_consolidate_day || 5,
      batchSize: tenant.auto_consolidate_batch_size || 20,
      lastRunAt: tenant.auto_consolidate_last_run_at || null,
      lastStatus: tenant.auto_consolidate_last_status || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/v1/irb/auto-consolidate/run
 * Manually trigger auto-consolidation for the current tenant. Mirrors the
 * logic the scheduler runs server-side. Body: { dryRun?: boolean, force?: boolean }
 */
router.post('/auto-consolidate/run', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID not found' });

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const dryRun = !!(req.body && req.body.dryRun);

    if (dryRun) {
      // Dry-run is fast — block and return the summary directly
      const summary = await runAutoConsolidationForTenant(tenant, { dryRun: true, source: 'manual' });
      return res.json(summary);
    }

    // Non-dry-run: return immediately and process in background so the client
    // can poll GET /auto-consolidate/progress for real-time updates.
    res.json({ queued: true, running: true, tenantId });

    // Fire and forget — do not await
    setImmediate(() => {
      runAutoConsolidationForTenant(tenant, { dryRun: false, source: 'manual' }).catch((err: any) => {
        console.error('[IRB] auto-consolidate background run failed:', err.message);
      });
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * POST /api/v1/irb/submit-batch
 * Split selected invoices into batches (per tenant batchSize setting),
 * combine each batch into ONE consolidated IRB document, submit it, and
 * apply the result to all invoices in that batch.
 * Progress is tracked in progressStore and can be polled via GET /auto-consolidate/progress.
 */
router.post('/submit-batch', async (req: AuthRequest, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID not found' });

  const invoiceIds: string[] = req.body?.invoiceIds;
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return res.status(400).json({ error: 'invoiceIds must be a non-empty array' });
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const batchSize = tenant.auto_consolidate_batch_size || 20;
  const batches = chunkArray(invoiceIds, batchSize);

  progressStore.start(String(tenantId), {
    source: 'manual',
    total: invoiceIds.length,
    batches: batches.length,
  });
  res.json({ queued: true, running: true, total: invoiceIds.length, batches: batches.length });

  setImmediate(async () => {
    let processed = 0, succeeded = 0, failed = 0;
    try {
      const creds = resolveIRBCredentials(tenant);
      if (!creds) {
        console.error('[IRB] submit-batch: IRB credentials not configured for tenant', tenantId);
        return;
      }
      const accessToken = await irbService.getToken(creds.clientId, creds.clientSecret);

      for (let i = 0; i < batches.length; i++) {
        progressStore.update(String(tenantId), { currentBatch: i + 1 });
        await submitConsolidatedBatchToIRB(batches[i], String(tenantId), {
          accessToken,
          tenant,
          onInvoiceDone: (success) => {
            processed++;
            if (success) succeeded++; else failed++;
            progressStore.update(String(tenantId), { processed, succeeded, failed });
          },
        });
      }
    } catch (err: any) {
      console.error('[IRB] submit-batch background failed:', err.message);
    } finally {
      progressStore.finish(String(tenantId));
    }
  });
});

/**
 * GET /api/v1/irb/auto-consolidate/progress
 * Returns real-time submission progress for the current tenant.
 */
router.get('/auto-consolidate/progress', (req: AuthRequest, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID not found' });
  const progress = progressStore.get(String(tenantId));
  return res.json(progress || { running: false });
});

/**
 * 构建 IRB 发票文档格式
 */
async function buildIRBDocument(invoice: any, tenant: any): Promise<any> {
  // Build IRB document in UBL 2.1 JSON format for MyInvois

  // Determine supplier identification based on entity type
  // Type 1 (individual) = use NRIC, Type 2 (company) = use BRN
  const supplierIdScheme = tenant.type === 1 ? "NRIC" : "BRN";
  // Remove hyphens from NRIC/BRN for document format
  const supplierIdValue = tenant.company_registration_no.replace(/-/g, '');

  // Format date and time properly - use invoice's issue date, not current time
  // Use the invoice's issue_date and set time to start of day to avoid timezone issues
  const invoiceDate = new Date(invoice.issue_date);
  const issueDate = invoiceDate.toISOString().split('T')[0];
  // Use a safe time in the past (00:00:00Z) to avoid "future date" errors
  const issueTime = '00:00:00Z';

  const document = {
    _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    Invoice: [
      {
        ID: [{ _: invoice.invoice_number }],
        IssueDate: [{ _: issueDate }],
        IssueTime: [{ _: issueTime }],
        InvoiceTypeCode: [{ _: "01", listVersionID: "1.0" }],
        DocumentCurrencyCode: [{ _: "MYR" }],

        // Note: InvoiceClassification is NOT supported in MyInvois API
        // Classification codes are used internally for categorization only

        // Signature placeholder (required for v1.0, validation disabled)
        Signature: [
          {
            ID: [{ _: "urn:oasis:names:specification:ubl:signature:Invoice" }],
            SignatureMethod: [{ _: "urn:oasis:names:specification:ubl:dsig:enveloped:xades" }]
          }
        ],

        // Supplier Party
        AccountingSupplierParty: [
          {
            Party: [
              {
                IndustryClassificationCode: [{ _: "46510", name: "Wholesale of computers, computer peripheral equipment and software" }],
                PartyIdentification: [
                  { ID: [{ _: tenant.tin_number, schemeID: "TIN" }] },
                  { ID: [{ _: supplierIdValue, schemeID: supplierIdScheme }] }
                ],
                PartyLegalEntity: [
                  {
                    RegistrationName: [{ _: tenant.company_name }]
                  }
                ],
                PostalAddress: [
                  {
                    CityName: [{ _: tenant.city || "Kuala Lumpur" }],
                    PostalZone: [{ _: tenant.postcode || "50000" }],
                    CountrySubentityCode: [{ _: "14" }],
                    AddressLine: [
                      { Line: [{ _: tenant.address_line1 || "Address Line 1" }] }
                    ],
                    Country: [
                      { IdentificationCode: [{ _: "MYS", listID: "3166-1", listAgencyID: "ISO" }] }
                    ]
                  }
                ],
                Contact: [
                  {
                    Telephone: [{ _: tenant.phone || "+60123456789" }],
                    ElectronicMail: [{ _: tenant.email || "contact@example.com" }]
                  }
                ]
              }
            ]
          }
        ],

        // Customer Party
        // For consolidated invoices, use a generic "General Public" customer
        // Cannot use same TIN/ID as supplier for consolidated invoices
        AccountingCustomerParty: [
          {
            Party: [
              {
                PartyIdentification: [
                  { ID: [{ _: "EI00000000010", schemeID: "TIN" }] },
                  { ID: [{ _: "NA", schemeID: "NRIC" }] }
                ],
                PartyLegalEntity: [
                  { RegistrationName: [{ _: "General Public" }] }
                ],
                PostalAddress: [
                  {
                    CityName: [{ _: tenant.city || 'Kuala Lumpur' }],
                    PostalZone: [{ _: tenant.postcode || '50000' }],
                    CountrySubentityCode: [{ _: tenant.state_code || "14" }],
                    AddressLine: [
                      { Line: [{ _: tenant.address_line1 || 'Address Line 1' }] }
                    ],
                    Country: [
                      { IdentificationCode: [{ _: "MYS", listID: "3166-1", listAgencyID: "ISO" }] }
                    ]
                  }
                ],
                Contact: [
                  {
                    Telephone: [{ _: tenant.phone || "+60123456789" }],
                    ElectronicMail: [{ _: tenant.email || "contact@example.com" }]
                  }
                ]
              }
            ]
          }
        ],

        // Tax Total - Match successful invoice format with TaxSubtotal
        TaxTotal: [
          {
            TaxAmount: [{ _: Number(invoice.tax_amount.toFixed(2)), currencyID: "MYR" }],
            TaxSubtotal: [
              {
                TaxableAmount: [{ _: Number(invoice.subtotal.toFixed(2)), currencyID: "MYR" }],
                TaxAmount: [{ _: Number(invoice.tax_amount.toFixed(2)), currencyID: "MYR" }],
                TaxCategory: [
                  {
                    ID: [{ _: "02" }],
                    TaxScheme: [
                      {
                        ID: [{ _: "OTH", schemeAgencyID: "6", schemeID: "UN/ECE 5153" }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],

        // Legal Monetary Total
        LegalMonetaryTotal: [
          {
            LineExtensionAmount: [{ _: Number(invoice.subtotal.toFixed(2)), currencyID: "MYR" }],
            TaxExclusiveAmount: [{ _: Number(invoice.subtotal.toFixed(2)), currencyID: "MYR" }],
            TaxInclusiveAmount: [{ _: Number(invoice.total_amount.toFixed(2)), currencyID: "MYR" }],
            AllowanceTotalAmount: [{ _: 0, currencyID: "MYR" }],
            PayableAmount: [{ _: Number(invoice.total_amount.toFixed(2)), currencyID: "MYR" }],
            PayableRoundingAmount: [{ _: 0, currencyID: "MYR" }]
          }
        ],

        // Invoice Lines - Match successful invoice format
        InvoiceLine: invoice.items.map((item: any, index: number) => ({
          ID: [{ _: (index + 1).toString() }],
          InvoicedQuantity: [{ _: Number(item.quantity), unitCode: "C62" }],
          LineExtensionAmount: [{ _: Number(item.line_total.toFixed(2)), currencyID: "MYR" }],
          TaxTotal: [
            {
              TaxAmount: [{ _: Number((item.line_total * (item.tax_rate / 100)).toFixed(2)), currencyID: "MYR" }],
              TaxSubtotal: [
                {
                  TaxableAmount: [{ _: Number(item.line_total.toFixed(2)), currencyID: "MYR" }],
                  TaxAmount: [{ _: Number((item.line_total * (item.tax_rate / 100)).toFixed(2)), currencyID: "MYR" }],
                  TaxCategory: [
                    {
                      ID: [{ _: "02" }],
                      TaxScheme: [
                        {
                          ID: [{ _: "OTH", schemeAgencyID: "6", schemeID: "UN/ECE 5153" }]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ],
          Item: [
            {
              CommodityClassification: [
                {
                  ItemClassificationCode: [{ _: invoice.classification_code || "001", listID: "CLASS" }]
                }
              ],
              Description: [{ _: item.description }]
            }
          ],
          Price: [
            {
              PriceAmount: [{ _: Number(item.unit_price.toFixed(2)), currencyID: "MYR" }]
            }
          ],
          ItemPriceExtension: [
            {
              Amount: [{ _: Number(item.line_total.toFixed(2)), currencyID: "MYR" }]
            }
          ]
        }))
      }
    ]
  };

  return document;
}

export default router;
