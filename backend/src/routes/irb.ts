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
  try {
    const { invoiceId } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID not found' });
    }

    // 获取发票数据
    const invoice = await Invoice.findOne({ _id: invoiceId, tenant_id: tenantId })
      .populate('customer_id')
      .populate('items.product_id');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // 获取租户信息（包含 IRB 凭证）
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

    // 获取 OAuth token
    const accessToken = await irbService.getToken(
      clientId,
      clientSecret
    );

    // 构建 IRB 发票格式
    const irbDocument = await buildIRBDocument(invoice, tenant);

    // 提交到 IRB
    const result = await irbService.submitDocument(
      irbDocument,
      invoice.invoice_number,
      accessToken
    );

    // 处理响应
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
    } else {
      return res.status(500).json({
        success: false,
        error: 'Unknown error during submission'
      });
    }

  } catch (error: any) {
    console.error('IRB submission error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
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
  // 这里需要根据 IRB UBL 2.1 格式构建文档
  // 简化版本，实际需要完整实现

  const document = {
    _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    Invoice: [
      {
        ID: [{ _: invoice.invoice_number }],
        IssueDate: [{ _: invoice.issue_date.toISOString().split('T')[0] }],
        IssueTime: [{ _: new Date().toTimeString().split(' ')[0] + 'Z' }],
        InvoiceTypeCode: [{ _: "01", listVersionID: "1.0" }],
        DocumentCurrencyCode: [{ _: "MYR" }],

        // Supplier (从 Tenant 获取)
        AccountingSupplierParty: [
          {
            Party: [
              {
                PartyIdentification: [
                  { ID: [{ _: tenant.tin_number, schemeID: "TIN" }] }
                ],
                PostalAddress: [
                  {
                    CityName: [{ _: tenant.city }],
                    PostalZone: [{ _: tenant.postcode }],
                    AddressLine: [
                      { Line: [{ _: tenant.address_line1 }] }
                    ],
                    Country: [
                      { IdentificationCode: [{ _: "MYS" }] }
                    ]
                  }
                ],
                PartyLegalEntity: [
                  { RegistrationName: [{ _: tenant.company_name }] }
                ]
              }
            ]
          }
        ],

        // Customer
        AccountingCustomerParty: [
          {
            Party: [
              {
                PartyIdentification: [
                  { ID: [{ _: invoice.customer_id?.tin_number || 'EI00000000010', schemeID: "TIN" }] }
                ],
                PostalAddress: [
                  {
                    CityName: [{ _: invoice.customer_id?.city || 'Unknown' }],
                    PostalZone: [{ _: invoice.customer_id?.postcode || '00000' }],
                    AddressLine: [
                      { Line: [{ _: invoice.customer_id?.address_line1 || 'Unknown' }] }
                    ],
                    Country: [
                      { IdentificationCode: [{ _: "MYS" }] }
                    ]
                  }
                ],
                PartyLegalEntity: [
                  { RegistrationName: [{ _: invoice.customer_id?.name || 'Unknown' }] }
                ]
              }
            ]
          }
        ],

        // Tax Total
        TaxTotal: [
          {
            TaxAmount: [{ _: invoice.tax_amount, currencyID: "MYR" }],
            TaxSubtotal: [
              {
                TaxableAmount: [{ _: invoice.subtotal, currencyID: "MYR" }],
                TaxAmount: [{ _: invoice.tax_amount, currencyID: "MYR" }],
                TaxCategory: [
                  {
                    ID: [{ _: "02" }],
                    Percent: [{ _: invoice.items[0]?.tax_rate || 0 }],
                    TaxScheme: [
                      { ID: [{ _: "OTH", schemeID: "UN/ECE 5153" }] }
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
            LineExtensionAmount: [{ _: invoice.subtotal, currencyID: "MYR" }],
            TaxExclusiveAmount: [{ _: invoice.subtotal, currencyID: "MYR" }],
            TaxInclusiveAmount: [{ _: invoice.total_amount, currencyID: "MYR" }],
            PayableAmount: [{ _: invoice.total_amount, currencyID: "MYR" }]
          }
        ],

        // Invoice Lines
        InvoiceLine: invoice.items.map((item: any, index: number) => ({
          ID: [{ _: (index + 1).toString() }],
          InvoicedQuantity: [{ _: item.quantity, unitCode: "C62" }],
          LineExtensionAmount: [{ _: item.line_total, currencyID: "MYR" }],
          Item: [
            {
              Description: [{ _: item.description }],
              CommodityClassification: [
                { ItemClassificationCode: [{ _: "022", listID: "CLASS" }] }
              ]
            }
          ],
          Price: [
            { PriceAmount: [{ _: item.unit_price, currencyID: "MYR" }] }
          ]
        }))
      }
    ]
  };

  return document;
}

export default router;
