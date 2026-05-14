import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, authenticateFlexible, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';
import { invoiceQueue } from '../config/queue';
import { logger } from '../utils/logger';
import { Invoice, Customer } from '../models';
import { PDFService } from '../services/pdfService';
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
  customer_id: z.string(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency: z.string().length(3).default('MYR'),
  exchange_rate: z.number().positive().default(1.0),
  payment_method: z.enum(['cash', 'bank_transfer', 'card', 'ewallet']).optional(),
  payment_terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    console.log('Received invoice data:', JSON.stringify(req.body, null, 2));
    const data = invoiceSchema.parse(req.body);

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;

    const itemsWithTotals = data.items.map((item) => {
      const line_total = item.quantity * item.unit_price;
      const item_tax = (line_total * item.tax_rate) / 100;
      subtotal += line_total;
      tax_amount += item_tax;

      return {
        product_id: item.product_id ? new mongoose.Types.ObjectId(item.product_id) : undefined,
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

    // Create invoice with items
    const invoice = await Invoice.create({
      tenant_id: req.tenantId,
      invoice_number: data.invoice_number,
      invoice_type: data.invoice_type,
      customer_id: new mongoose.Types.ObjectId(data.customer_id),
      issue_date: new Date(data.issue_date),
      due_date: data.due_date ? new Date(data.due_date) : undefined,
      currency: data.currency,
      exchange_rate: data.exchange_rate,
      subtotal,
      tax_amount,
      total_amount,
      payment_method: data.payment_method,
      payment_terms: data.payment_terms,
      status: 'draft',
      items: itemsWithTotals,
    });

    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invoice validation errors:', JSON.stringify(error.issues, null, 2));
      const errorMessages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      next(new ValidationError(`Validation failed: ${errorMessages}`, undefined, error.issues));
    } else {
      next(error);
    }
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

export default router;
