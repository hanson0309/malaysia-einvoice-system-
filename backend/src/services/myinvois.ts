// backend/src/services/myinvois.ts
import axios, { AxiosError } from 'axios';
import { Tenant } from '../models';
import { IInvoice, IInvoiceItem, ICustomer, ITenant } from '../models';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface MyInvoisConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  tokenUrl: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MyInvoisSubmissionResponse {
  submissionUid: string;
  acceptedDocuments: Array<{
    uuid: string;
    invoiceCodeNumber: string;
  }>;
  rejectedDocuments: Array<{
    uuid: string;
    invoiceCodeNumber: string;
    error: {
      code: string;
      message: string;
      target: string;
      details: Array<{
        code: string;
        message: string;
        target: string;
      }>;
    };
  }>;
}

interface DocumentStatusResponse {
  uuid: string;
  submissionUid: string;
  longId: string;
  internalId: string;
  typeName: string;
  typeVersionName: string;
  issuerTin: string;
  issuerName: string;
  receiverId: string;
  receiverName: string;
  dateTimeIssued: string;
  dateTimeReceived: string;
  dateTimeValidated: string;
  totalSales: number;
  totalDiscount: number;
  netAmount: number;
  total: number;
  status: 'Valid' | 'Invalid' | 'Submitted' | 'Cancelled';
  cancelDateTime?: string;
  rejectRequestDateTime?: string;
  documentStatusReason?: string;
  createdByUserId: string;
  validationResults: {
    status: string;
    validationSteps: Array<{
      name: string;
      status: string;
      error?: {
        code: string;
        message: string;
        target: string;
      };
    }>;
  };
}

export class MyInvoisClient {
  private config: MyInvoisConfig;
  private tenantId: string;

  constructor(tenantId: string, config: MyInvoisConfig) {
    this.tenantId = tenantId;
    this.config = config;
  }

  /**
   * Get access token with caching in database
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    const tenant = await Tenant.findById(this.tenantId);

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    const now = new Date();

    // If token exists and hasn't expired (with 5 min buffer), return it
    if (
      tenant.myinvois_access_token &&
      tenant.myinvois_token_expiry &&
      new Date(tenant.myinvois_token_expiry) > new Date(now.getTime() + 5 * 60 * 1000)
    ) {
      return tenant.myinvois_access_token;
    }

    // Otherwise, fetch a new token
    try {
      const response = await axios.post<TokenResponse>(
        this.config.tokenUrl,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
          scope: 'InvoicingAPI',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in } = response.data;
      const expiryDate = new Date(now.getTime() + expires_in * 1000);

      // Cache the token in database
      tenant.myinvois_access_token = access_token;
      tenant.myinvois_token_expiry = expiryDate;
      await tenant.save();

      logger.info(`MyInvois token refreshed for tenant ${this.tenantId}`);
      return access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error('MyInvois OAuth2 error:', axiosError.response?.data);
        throw new AppError(
          `Failed to obtain MyInvois access token: ${axiosError.message}`,
          500,
          true,
          undefined,
          axiosError.response?.data as any
        );
      }
      throw error;
    }
  }

  /**
   * Submit invoice to MyInvois API
   */
  async submitInvoice(
    invoice: IInvoice,
    customer: ICustomer,
    tenant: ITenant
  ): Promise<MyInvoisSubmissionResponse> {
    const token = await this.getAccessToken();
    const payload = buildMyInvoisPayload(invoice, customer, tenant);

    try {
      const response = await axios.post<MyInvoisSubmissionResponse>(
        `${this.config.baseUrl}/api/v1.0/documentsubmissions`,
        {
          documents: [payload],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Invoice ${invoice.invoice_number} submitted to MyInvois`, {
        submissionUid: response.data.submissionUid,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error('MyInvois submission error:', axiosError.response?.data);
        throw new AppError(
          `Failed to submit invoice to MyInvois: ${axiosError.message}`,
          500,
          true,
          undefined,
          axiosError.response?.data as any
        );
      }
      throw error;
    }
  }

  /**
   * Get document status from MyInvois
   */
  async getDocumentStatus(uuid: string): Promise<DocumentStatusResponse> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get<DocumentStatusResponse>(
        `${this.config.baseUrl}/api/v1.0/documents/${uuid}/details`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error('MyInvois status check error:', axiosError.response?.data);
        throw new AppError(
          `Failed to get document status from MyInvois: ${axiosError.message}`,
          500,
          true,
          undefined,
          axiosError.response?.data as any
        );
      }
      throw error;
    }
  }

  /**
   * Determine if an error is retryable
   */
  static isRetryable(errorCode?: string): boolean {
    if (!errorCode) return false;

    const retryableCodes = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMIT',
      '500',
      '502',
      '503',
      '504',
    ];

    return retryableCodes.some((code) => errorCode.includes(code));
  }
}

/**
 * Build MyInvois UBL 2.1 payload from invoice data
 */
export function buildMyInvoisPayload(
  invoice: IInvoice,
  customer: ICustomer,
  tenant: ITenant
): any {
  const invoiceTypeMapping: Record<string, string> = {
    '01': '01',  // Invoice
    '02': '02',  // Credit Note
    '03': '03',  // Debit Note
    '04': '04',  // Refund Note
  };

  const taxTypeMapping: Record<string, { code: string; reason?: string }> = {
    SST: { code: '01' },  // Sales and Service Tax
    E: { code: 'E', reason: 'Exempt' },
    Z: { code: 'Z', reason: 'Zero Rated' },
    SR: { code: 'SR', reason: 'Standard Rated' },
  };

  // Build invoice lines
  const invoiceLines = invoice.items.map((item, index) => {
    const lineExtensionAmount = item.quantity * item.unit_price;
    const taxInfo = taxTypeMapping[item.tax_type] || { code: '01' };

    return {
      ID: {
        _: String(index + 1),
      },
      InvoicedQuantity: {
        _: item.quantity.toFixed(2),
        unitCode: 'C62',  // Unit (piece)
      },
      LineExtensionAmount: {
        _: lineExtensionAmount.toFixed(2),
        currencyID: invoice.currency,
      },
      TaxTotal: [
        {
          TaxAmount: {
            _: item.tax_amount.toFixed(2),
            currencyID: invoice.currency,
          },
          TaxSubtotal: [
            {
              TaxableAmount: {
                _: lineExtensionAmount.toFixed(2),
                currencyID: invoice.currency,
              },
              TaxAmount: {
                _: item.tax_amount.toFixed(2),
                currencyID: invoice.currency,
              },
              TaxCategory: {
                ID: {
                  _: taxInfo.code,
                },
                Percent: {
                  _: item.tax_rate.toFixed(2),
                },
                TaxScheme: {
                  ID: {
                    _: '01',
                    schemeID: 'UN/ECE 5153',
                    schemeAgencyID: '6',
                  },
                },
                ...(taxInfo.reason && {
                  TaxExemptionReason: {
                    _: item.tax_exemption_reason || taxInfo.reason,
                  },
                }),
              },
            },
          ],
        },
      ],
      Item: {
        Description: [
          {
            _: item.description,
          },
        ],
      },
      Price: {
        PriceAmount: {
          _: item.unit_price.toFixed(2),
          currencyID: invoice.currency,
        },
      },
    };
  });

  // Build tax totals by tax type
  const taxTotals = invoice.items.reduce((acc, item) => {
    const taxType = item.tax_type;
    if (!acc[taxType]) {
      acc[taxType] = {
        taxableAmount: 0,
        taxAmount: 0,
        taxRate: item.tax_rate,
      };
    }
    acc[taxType].taxableAmount += item.quantity * item.unit_price;
    acc[taxType].taxAmount += item.tax_amount;
    return acc;
  }, {} as Record<string, { taxableAmount: number; taxAmount: number; taxRate: number }>);

  const taxSubtotals = Object.entries(taxTotals).map(([taxType, totals]) => {
    const taxInfo = taxTypeMapping[taxType] || { code: '01' };
    return {
      TaxableAmount: {
        _: totals.taxableAmount.toFixed(2),
        currencyID: invoice.currency,
      },
      TaxAmount: {
        _: totals.taxAmount.toFixed(2),
        currencyID: invoice.currency,
      },
      TaxCategory: {
        ID: {
          _: taxInfo.code,
        },
        Percent: {
          _: totals.taxRate.toFixed(2),
        },
        TaxScheme: {
          ID: {
            _: '01',
            schemeID: 'UN/ECE 5153',
            schemeAgencyID: '6',
          },
        },
        ...(taxInfo.reason && {
          TaxExemptionReason: {
            _: taxInfo.reason,
          },
        }),
      },
    };
  });

  // Build the UBL 2.1 document
  const ublDocument = {
    _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    Invoice: [
      {
        ID: [
          {
            _: invoice.invoice_number,
          },
        ],
        IssueDate: [
          {
            _: invoice.issue_date.toISOString().split('T')[0],
          },
        ],
        IssueTime: [
          {
            _: invoice.issue_date.toISOString().split('T')[1].split('.')[0] + 'Z',
          },
        ],
        InvoiceTypeCode: [
          {
            _: invoiceTypeMapping[invoice.invoice_type] || '01',
            listVersionID: '1.0',
          },
        ],
        DocumentCurrencyCode: [
          {
            _: invoice.currency,
          },
        ],
        ...(invoice.currency !== 'MYR' && {
          TaxCurrencyCode: [
            {
              _: 'MYR',
            },
          ],
          TaxExchangeRate: [
            {
              SourceCurrencyCode: [
                {
                  _: invoice.currency,
                },
              ],
              TargetCurrencyCode: [
                {
                  _: 'MYR',
                },
              ],
              CalculationRate: [
                {
                  _: invoice.exchange_rate.toFixed(4),
                },
              ],
            },
          ],
        }),
        ...(invoice.original_invoice_number && {
          BillingReference: [
            {
              InvoiceDocumentReference: [
                {
                  ID: [
                    {
                      _: invoice.original_invoice_number,
                    },
                  ],
                },
              ],
            },
          ],
        }),
        ...(invoice.internal_reference_no && {
          AdditionalDocumentReference: [
            {
              ID: [
                {
                  _: invoice.internal_reference_no,
                },
              ],
              DocumentType: [
                {
                  _: 'CustomsImportForm',
                },
              ],
            },
          ],
        }),
        AccountingSupplierParty: [
          {
            Party: [
              {
                IndustryClassificationCode: [
                  {
                    _: tenant.business_activity_code,
                    name: 'Malaysian Standard Industrial Classification (MSIC)',
                  },
                ],
                PartyIdentification: [
                  {
                    ID: [
                      {
                        _: tenant.tin_number,
                        schemeID: 'TIN',
                      },
                    ],
                  },
                  {
                    ID: [
                      {
                        _: tenant.company_registration_no,
                        schemeID: 'BRN',
                      },
                    ],
                  },
                  ...(tenant.sst_registration_no
                    ? [
                        {
                          ID: [
                            {
                              _: tenant.sst_registration_no,
                              schemeID: 'SST',
                            },
                          ],
                        },
                      ]
                    : []),
                ],
                PostalAddress: [
                  {
                    AddressLine: [
                      {
                        Line: [
                          {
                            _: tenant.address_line1,
                          },
                        ],
                      },
                      ...(tenant.address_line2
                        ? [
                            {
                              Line: [
                                {
                                  _: tenant.address_line2,
                                },
                              ],
                            },
                          ]
                        : []),
                    ],
                    CityName: [
                      {
                        _: tenant.city,
                      },
                    ],
                    PostalZone: [
                      {
                        _: tenant.postcode,
                      },
                    ],
                    CountrySubentityCode: [
                      {
                        _: tenant.state_code,
                      },
                    ],
                    Country: [
                      {
                        IdentificationCode: [
                          {
                            _: tenant.country_code,
                            listID: 'ISO3166-1',
                            listAgencyID: '6',
                          },
                        ],
                      },
                    ],
                  },
                ],
                PartyLegalEntity: [
                  {
                    RegistrationName: [
                      {
                        _: tenant.company_name,
                      },
                    ],
                  },
                ],
                Contact: [
                  {
                    Telephone: [
                      {
                        _: tenant.phone,
                      },
                    ],
                    ElectronicMail: [
                      {
                        _: tenant.email,
                      },
                    ],
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
                  {
                    ID: [
                      {
                        _: customer.registration_no,
                        schemeID: customer.id_type,
                      },
                    ],
                  },
                  ...(customer.tin_number
                    ? [
                        {
                          ID: [
                            {
                              _: customer.tin_number,
                              schemeID: 'TIN',
                            },
                          ],
                        },
                      ]
                    : []),
                ],
                PostalAddress: [
                  {
                    AddressLine: [
                      {
                        Line: [
                          {
                            _: customer.address_line1 || 'NA',
                          },
                        ],
                      },
                      ...(customer.address_line2
                        ? [
                            {
                              Line: [
                                {
                                  _: customer.address_line2,
                                },
                              ],
                            },
                          ]
                        : []),
                    ],
                    CityName: [
                      {
                        _: customer.city || 'NA',
                      },
                    ],
                    PostalZone: [
                      {
                        _: customer.postcode || '00000',
                      },
                    ],
                    CountrySubentityCode: [
                      {
                        _: customer.state_code || '14',
                      },
                    ],
                    Country: [
                      {
                        IdentificationCode: [
                          {
                            _: customer.country_code,
                            listID: 'ISO3166-1',
                            listAgencyID: '6',
                          },
                        ],
                      },
                    ],
                  },
                ],
                PartyLegalEntity: [
                  {
                    RegistrationName: [
                      {
                        _: customer.name,
                      },
                    ],
                  },
                ],
                ...(customer.email || customer.phone
                  ? [
                      {
                        Contact: [
                          {
                            ...(customer.phone && {
                              Telephone: [
                                {
                                  _: customer.phone,
                                },
                              ],
                            }),
                            ...(customer.email && {
                              ElectronicMail: [
                                {
                                  _: customer.email,
                                },
                              ],
                            }),
                          },
                        ],
                      },
                    ]
                  : []),
              },
            ],
          },
        ],
        ...(invoice.payment_method && {
          PaymentMeans: [
            {
              PaymentMeansCode: [
                {
                  _: invoice.payment_method === 'cash' ? '01' : '02',
                },
              ],
            },
          ],
        }),
        ...(invoice.payment_terms && {
          PaymentTerms: [
            {
              Note: [
                {
                  _: invoice.payment_terms,
                },
              ],
            },
          ],
        }),
        TaxTotal: [
          {
            TaxAmount: {
              _: invoice.tax_amount.toFixed(2),
              currencyID: invoice.currency,
            },
            TaxSubtotal: taxSubtotals,
          },
        ],
        LegalMonetaryTotal: [
          {
            LineExtensionAmount: [
              {
                _: invoice.subtotal.toFixed(2),
                currencyID: invoice.currency,
              },
            ],
            TaxExclusiveAmount: [
              {
                _: invoice.subtotal.toFixed(2),
                currencyID: invoice.currency,
              },
            ],
            TaxInclusiveAmount: [
              {
                _: invoice.total_amount.toFixed(2),
                currencyID: invoice.currency,
              },
            ],
            PayableAmount: [
              {
                _: invoice.total_amount.toFixed(2),
                currencyID: invoice.currency,
              },
            ],
          },
        ],
        InvoiceLine: invoiceLines,
      },
    ],
  };

  return ublDocument;
}

