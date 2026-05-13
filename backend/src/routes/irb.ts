import { Router, Response } from 'express';
import { irbService } from '../services/irbService';
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
  console.log('=== IRB SUBMIT ENDPOINT CALLED ===');
  console.log('Invoice ID:', req.params.invoiceId);
  console.log('Tenant ID from request:', req.tenantId);

  try {
    const { invoiceId } = req.params;
    const tenantId = req.tenantId;

    console.log('Step 1: Checking tenant ID');
    if (!tenantId) {
      console.log('ERROR: Tenant ID not found');
      return res.status(400).json({ error: 'Tenant ID not found' });
    }

    // 获取发票数据
    console.log('Step 2: Fetching invoice from database');
    const invoice = await Invoice.findOne({ _id: invoiceId, tenant_id: tenantId })
      .populate('customer_id')
      .populate('items.product_id');

    if (!invoice) {
      console.log('ERROR: Invoice not found');
      return res.status(404).json({ error: 'Invoice not found' });
    }
    console.log('Invoice found:', invoice.invoice_number);

    // 获取租户信息（包含 IRB 凭证）
    console.log('Step 3: Fetching tenant information');
    const tenant = await Tenant.findById(tenantId);
    console.log('Tenant found:', tenant?.company_name);

    if (!tenant) {
      console.log('ERROR: Tenant not found');
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get credentials: try tenant first, then environment variables
    console.log('Step 4: Getting credentials');
    let clientId: string;
    let clientSecret: string;

    if (tenant?.myinvois_client_id && tenant?.myinvois_client_secret) {
      // Use tenant-specific credentials
      console.log('Using tenant-specific credentials');
      clientId = tenant.myinvois_client_id;
      clientSecret = irbService.decrypt(
        tenant.myinvois_client_secret,
        tenantId.toString()
      );
    } else {
      // Fall back to environment variables
      console.log('Using environment credentials');
      const envCreds = irbService.getEnvironmentCredentials();
      if (!envCreds) {
        console.log('ERROR: No credentials configured');
        return res.status(400).json({
          error: 'IRB credentials not configured. Please add credentials to tenant or environment variables.'
        });
      }
      clientId = envCreds.clientId;
      clientSecret = envCreds.clientSecret;
    }
    console.log('Client ID:', clientId);

    // 获取 OAuth token
    console.log('Step 5: Getting OAuth token');
    const accessToken = await irbService.getToken(
      clientId,
      clientSecret
    );
    console.log('Access token obtained');

    // 验证纳税人 (Validate Taxpayer) - Optional, don't block submission if it fails
    console.log('Step 5.5: Validating taxpayer');
    const idType = tenant.type === 1 ? 'NRIC' : 'BRN'; // NRIC for individual, BRN for company
    // Remove hyphens from NRIC/BRN for API format (e.g., 040309-08-1061 -> 040309081061)
    const idValue = tenant.company_registration_no.replace(/-/g, '');
    console.log('Validating with:', { idType, idValue, tin: tenant.tin_number });

    try {
      const validationResult = await irbService.validateTaxpayer(
        idType,
        idValue,
        tenant.tin_number,
        accessToken
      );
      console.log('Taxpayer validation result:', validationResult);
    } catch (validationError: any) {
      console.warn('Taxpayer validation failed (continuing anyway):', validationError.message);
      // Don't block submission - validation is optional and may fail for various reasons
    }

    // 构建 IRB 发票格式
    console.log('Step 6: Building IRB document');
    const irbDocument = await buildIRBDocument(invoice, tenant);
    console.log('IRB document built');

    // 提交到 IRB
    console.log('Step 7: Submitting to IRB');
    const result = await irbService.submitDocument(
      irbDocument,
      invoice.invoice_number,
      accessToken
    );
    console.log('IRB submission result:', JSON.stringify(result, null, 2));

    // 处理响应
    console.log('Checking submission result structure...');
    console.log('Has acceptedDocuments?', !!result.acceptedDocuments);
    console.log('Has rejectedDocuments?', !!result.rejectedDocuments);
    console.log('Has error?', !!result.error);

    if (result.acceptedDocuments && result.acceptedDocuments.length > 0) {
      const uuid = result.acceptedDocuments[0].uuid;

      // 更新发票状态
      invoice.lhdn_submission_uid = uuid;
      invoice.status = 'submitted';
      invoice.lhdn_submitted_at = new Date();
      await invoice.save();

      return res.json({
        success: true,
        uuid: uuid,
        message: 'Invoice submitted successfully'
      });
    } else if (result.rejectedDocuments && result.rejectedDocuments.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invoice rejected by IRB',
        details: result.rejectedDocuments[0].error
      });
    } else if (result.error) {
      // Handle error response from IRB
      return res.status(400).json({
        success: false,
        error: 'IRB API Error',
        details: result.error
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Unknown error during submission',
        fullResponse: result
      });
    }

  } catch (error: any) {
    console.error('IRB submission error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: error.response?.data
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
 * 构建 IRB 发票文档格式
 */
async function buildIRBDocument(invoice: any, tenant: any): Promise<any> {
  // Build IRB document in UBL 2.1 JSON format for MyInvois

  // Determine supplier identification based on entity type
  // Type 1 (individual) = use NRIC, Type 2 (company) = use BRN
  const supplierIdScheme = tenant.type === 1 ? "NRIC" : "BRN";
  // Remove hyphens from NRIC/BRN for document format
  const supplierIdValue = tenant.company_registration_no.replace(/-/g, '');

  console.log('Building document for tenant type:', tenant.type);
  console.log('Supplier ID scheme:', supplierIdScheme);
  console.log('Supplier ID value:', supplierIdValue);

  // Format date and time properly - use current date/time for submission
  const now = new Date();
  const issueDate = now.toISOString().split('T')[0];
  const issueTime = now.toISOString().split('T')[1].split('.')[0] + 'Z';

  const document = {
    _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    Invoice: [
      {
        ID: [{ _: invoice.invoice_number }],
        IssueDate: [{ _: issueDate }],
        IssueTime: [{ _: issueTime }],
        InvoiceTypeCode: [{ _: "01", listVersionID: "1.1" }],
        DocumentCurrencyCode: [{ _: "MYR" }],

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

        // Customer Party - Match successful invoice format with all required fields
        AccountingCustomerParty: [
          {
            Party: [
              {
                PartyIdentification: [
                  { ID: [{ _: invoice.customer_id?.tin_number || 'EI00000000010', schemeID: "TIN" }] },
                  { ID: [{ _: invoice.customer_id?.registration_no || '900101011234', schemeID: invoice.customer_id?.id_type || "NRIC" }] }
                ],
                PartyLegalEntity: [
                  { RegistrationName: [{ _: invoice.customer_id?.name || 'Customer Name' }] }
                ],
                PostalAddress: [
                  {
                    CityName: [{ _: invoice.customer_id?.city || 'Kuala Lumpur' }],
                    PostalZone: [{ _: invoice.customer_id?.postcode || '50000' }],
                    CountrySubentityCode: [{ _: invoice.customer_id?.state_code || "14" }],
                    AddressLine: [
                      { Line: [{ _: invoice.customer_id?.address_line1 || 'Address Line 1' }] }
                    ],
                    Country: [
                      { IdentificationCode: [{ _: "MYS", listID: "3166-1", listAgencyID: "ISO" }] }
                    ]
                  }
                ],
                Contact: [
                  {
                    Telephone: [{ _: invoice.customer_id?.phone || "+60123456789" }],
                    ElectronicMail: [{ _: invoice.customer_id?.email || "customer@example.com" }]
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
                  ItemClassificationCode: [{ _: "001", listID: "CLASS" }]
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
