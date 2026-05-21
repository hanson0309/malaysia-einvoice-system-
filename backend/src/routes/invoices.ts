import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, authenticateFlexible, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { sendInvoiceRateLimiter } from '../middleware/rateLimiter';
import { ValidationError, NotFoundError } from '../utils/errors';
import { invoiceQueue } from '../config/queue';
import { logger } from '../utils/logger';
import { Invoice, Customer, InvoiceSending, Tenant } from '../models';
import { PDFService } from '../services/pdfService';
import { EmailService } from '../services/EmailService';
import { WhatsAppService } from '../services/WhatsAppService';
import mongoose from 'mongoose';

const router = Router();

// PDF endpoint with flexible auth (before the global middleware)
router.get('/:id/pdf', authenticateFlexible, extractTenant, async (req: AuthRequest, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    }).populate('customer_id', 'name email phone address_line1 address_line2 city postcode state_code');

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;

    invoice.items.forEach((item: any) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemTax = (itemTotal * item.tax_rate) / 100;
      subtotal += itemTotal;
      totalTax += itemTax;
    });

    const total = subtotal + totalTax;

    // Prepare invoice data for PDF
    const invoiceData = {
      invoice_number: invoice.invoice_number,
      invoice_type: invoice.invoice_type,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      customer: {
        name: (invoice.customer_id as any)?.name || 'Unknown Customer',
        email: (invoice.customer_id as any)?.email,
        phone: (invoice.customer_id as any)?.phone,
        address_line1: (invoice.customer_id as any)?.address_line1,
        address_line2: (invoice.customer_id as any)?.address_line2,
        city: (invoice.customer_id as any)?.city,
        postcode: (invoice.customer_id as any)?.postcode,
        state_code: (invoice.customer_id as any)?.state_code,
      },
      items: invoice.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_type: item.tax_type,
        tax_rate: item.tax_rate,
      })),
      subtotal,
      tax: totalTax,
      total,
      currency: invoice.currency || 'MYR',
      payment_method: invoice.payment_method,
    };

    // Generate PDF
    PDFService.generateInvoicePDF(invoiceData, res);
  } catch (error) {
    next(error);
  }
});

// Apply authentication to all other routes
router.use(authenticateJWT);
router.use(extractTenant);

const invoiceItemSchema = z.object({
  product_id: z.string().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  tax_type: z.enum(['SST', 'E', 'Z', 'SR']),
  tax_rate: z.number().min(0).max(100),
  tax_exemption_reason: z.string().max(200).optional(),
});

const invoiceSchema = z.object({
  invoice_number: z.string().min(1).max(50),
  invoice_type: z.enum(['01', '02', '03', '04']),
  customer_id: z.string().optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // Optional for POS invoices
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency: z.string().length(3).default('MYR'),
  exchange_rate: z.number().positive().default(1.0),
  payment_method: z.enum(['cash', 'bank_transfer', 'card', 'ewallet']).optional(),
  payment_terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
  // POS fields
  source: z.enum(['manual', 'pos']).optional(),
  pos_transaction_id: z.string().optional(),
}).refine((data) => {
  // Manual B2B invoices (type '01' with source 'manual') require customer_id
  // POS invoices (type '01' with source 'pos') don't require customer_id (will use "General Public")
  if (data.invoice_type === '01' && data.source === 'manual') {
    return !!data.customer_id;
  }
  return true;
}, {
  message: "customer_id is required for manual B2B invoices (invoice_type: '01')",
  path: ["customer_id"]
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    console.log('=== CREATE INVOICE REQUEST ===');
    console.log('Received invoice data:', JSON.stringify(req.body, null, 2));
    console.log('Tenant ID:', req.tenantId);

    const data = invoiceSchema.parse(req.body);
    console.log('✓ Validation passed');

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;

    const itemsWithTotals = data.items.map((item) => {
      const line_total = item.quantity * item.unit_price;
      const item_tax = (line_total * item.tax_rate) / 100;
      subtotal += line_total;
      tax_amount += item_tax;

      // Only convert product_id to ObjectId if it's a valid 24-char hex string
      let productId: mongoose.Types.ObjectId | undefined;
      if (item.product_id) {
        try {
          // Check if it's a valid ObjectId format (24 hex characters)
          if (/^[0-9a-fA-F]{24}$/.test(item.product_id)) {
            productId = new mongoose.Types.ObjectId(item.product_id);
          } else {
            console.log(`Skipping invalid product_id: ${item.product_id}`);
          }
        } catch (error) {
          console.log(`Failed to convert product_id: ${item.product_id}`, error);
        }
      }

      return {
        product_id: productId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_type: item.tax_type,
        tax_rate: item.tax_rate,
        tax_amount: item_tax,
        tax_exemption_reason: item.tax_exemption_reason,
        line_total,
      };
    });

    const total_amount = subtotal + tax_amount;
    console.log('✓ Calculated totals - Subtotal:', subtotal, 'Tax:', tax_amount, 'Total:', total_amount);

    // Use server date for POS invoices if not provided (to avoid timezone issues)
    const issueDate = data.issue_date
      ? new Date(data.issue_date)
      : new Date(); // Use server's current date

    // Create invoice with items
    const invoiceData: any = {
      tenant_id: req.tenantId,
      invoice_number: data.invoice_number,
      invoice_type: data.invoice_type,
      customer_id: data.customer_id ? new mongoose.Types.ObjectId(data.customer_id) : undefined,
      issue_date: issueDate,
      due_date: data.due_date ? new Date(data.due_date) : undefined,
      currency: data.currency,
      exchange_rate: data.exchange_rate,
      subtotal,
      tax_amount,
      total_amount,
      payment_method: data.payment_method,
      payment_terms: data.payment_terms,
      status: 'draft' as const,
      items: itemsWithTotals,
      source: data.source || 'manual',
      pos_transaction_id: data.pos_transaction_id,
    };

    console.log('Creating invoice with data:', JSON.stringify(invoiceData, null, 2));
    const invoice = await Invoice.create(invoiceData);
    console.log('✓ Invoice created successfully:', invoice._id);

    res.status(201).json(invoice);
  } catch (error) {
    console.error('=== CREATE INVOICE ERROR ===');
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', JSON.stringify(error.issues, null, 2));
      const errorMessages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      next(new ValidationError(`Validation failed: ${errorMessages}`, undefined, error.issues));
    } else {
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', (error as any)?.message);
      console.error('Error stack:', (error as any)?.stack);
      next(error);
    }
  }
});

router.get('/next-number', async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}${month}-`;

    const count = await Invoice.countDocuments({
      tenant_id: req.tenantId,
      invoice_number: { $regex: `^INV-${year}${month}-` },
      deleted_at: null,
    });

    const nextNum = String(count + 1).padStart(4, '0');
    res.json({ invoice_number: `${prefix}${nextNum}` });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const query: any = {
      tenant_id: req.tenantId,
      deleted_at: null,
    };

    if (status) {
      query.status = status;
    }

    if (req.query.source) {
      query.source = req.query.source;
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('customer_id', 'name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(query),
    ]);

    // Transform invoices to include customerName
    const transformedInvoices = invoices.map(invoice => {
      const invoiceObj: any = invoice.toObject();
      return {
        ...invoiceObj,
        customerName: invoiceObj.customer_id?.name || 'Unknown',
      };
    });

    res.json({
      data: transformedInvoices,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    }).populate('customer_id', 'name email phone address_line1 address_line2 city postcode state_code');

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Transform the response to match frontend expectations
    const invoiceData: any = invoice.toObject();
    invoiceData.customer = invoiceData.customer_id;
    delete invoiceData.customer_id;

    res.json(invoiceData);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    // Only allow deleting draft invoices
    const invoice = await Invoice.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant_id: req.tenantId,
        status: 'draft',
        deleted_at: null,
      },
      { deleted_at: new Date() },
      { returnDocument: 'after' }  // ✅ 修复 Mongoose 警告
    );

    if (!invoice) {
      throw new NotFoundError('Invoice not found or cannot be deleted. Only draft invoices can be deleted.');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:id/submit', async (req: AuthRequest, res, next) => {
  try {
    // Validate invoice can be submitted
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status !== 'draft' && invoice.status !== 'validated') {
      throw new ValidationError('Invoice cannot be submitted in current status');
    }

    // Update status to validated
    invoice.status = 'validated';
    await invoice.save();

    // Queue submission job
    const job = await invoiceQueue.add({
      invoiceId: req.params.id,
      tenantId: req.tenantId,
    });

    logger.info('Invoice submission queued', {
      invoiceId: req.params.id,
      jobId: job.id,
    });

    res.json({
      message: 'Invoice submission queued',
      job_id: job.id,
      status: 'validated',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/send', sendInvoiceRateLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { send_method, email_subject, email_message, whatsapp_message } = req.body;

    if (!['email', 'whatsapp', 'both'].includes(send_method)) {
      throw new ValidationError('Invalid send_method. Must be email, whatsapp, or both');
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    }).populate('customer_id');

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const customer = invoice.customer_id as any;
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // Validate customer has required contact info before creating record
    if (send_method === 'email' || send_method === 'both') {
      if (!customer.email) {
        throw new ValidationError('Customer email is missing');
      }
    }

    if (send_method === 'whatsapp' || send_method === 'both') {
      if (!customer.phone) {
        throw new ValidationError('Customer phone number is missing');
      }
    }

    const sendingRecord = await InvoiceSending.create({
      tenant_id: req.tenantId,
      invoice_id: invoice._id,
      customer_id: customer._id,
      send_method,
      email_sent: false,
      email_status: 'pending',
      email_to: customer.email || '',
      whatsapp_link_generated: false,
      whatsapp_phone: customer.phone || '',
      sent_by: req.user?.user_id,
    });

    let emailSent = false;
    let whatsappLink: string | undefined;

    if (send_method === 'email' || send_method === 'both') {

      try {
        const pdfBuffer = await PDFService.generateInvoicePDFBuffer({
          invoice_number: invoice.invoice_number,
          invoice_type: invoice.invoice_type,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address_line1: customer.address_line1,
            address_line2: customer.address_line2,
            city: customer.city,
            postcode: customer.postcode,
            state_code: customer.state_code,
          },
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax_amount,
          total: invoice.total_amount,
          currency: invoice.currency,
          payment_method: invoice.payment_method,
        });

        const emailService = new EmailService();
        await emailService.sendInvoice({
          to: customer.email,
          invoice: {
            invoice_number: invoice.invoice_number,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            total_amount: invoice.total_amount,
          },
          customer: { name: customer.name },
          tenant: {
            company_name: tenant.company_name,
            email: tenant.email,
            phone: tenant.phone,
          },
          pdfBuffer,
          customSubject: email_subject,
          customMessage: email_message,
        });

        await InvoiceSending.updateOne(
          { _id: sendingRecord._id },
          {
            email_sent: true,
            email_sent_at: new Date(),
            email_status: 'sent',
          }
        );

        emailSent = true;
      } catch (error: any) {
        await InvoiceSending.updateOne(
          { _id: sendingRecord._id },
          {
            email_status: 'failed',
            email_error_message: error.message,
          }
        );
      }
    }

    if (send_method === 'whatsapp' || send_method === 'both') {
      try {
        whatsappLink = WhatsAppService.generateInvoiceLink({
          phone: customer.phone,
          invoice: {
            invoice_number: invoice.invoice_number,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            total_amount: invoice.total_amount,
          },
          customer: { name: customer.name },
          tenant: {
            company_name: tenant.company_name,
            phone: tenant.phone,
          },
          customMessage: whatsapp_message,
        });

        await InvoiceSending.updateOne(
          { _id: sendingRecord._id },
          {
            whatsapp_link_generated: true,
            whatsapp_link: whatsappLink,
          }
        );
      } catch (error: any) {
        await InvoiceSending.updateOne(
          { _id: sendingRecord._id },
          {
            whatsapp_error_message: error.message,
          }
        );
      }
    }

    res.json({
      success: true,
      data: {
        sending_id: sendingRecord._id,
        email_sent: emailSent,
        whatsapp_link: whatsappLink,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/sending-history', async (req: AuthRequest, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const history = await InvoiceSending.find({
      tenant_id: req.tenantId,
      invoice_id: req.params.id,
    })
      .populate('sent_by', 'email')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
