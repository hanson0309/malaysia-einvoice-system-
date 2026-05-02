import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';
import { invoiceQueue } from '../config/queue';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const invoiceItemSchema = z.object({
  product_id: z.string().uuid().optional(),
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
  customer_id: z.string().uuid(),
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
        ...item,
        tax_amount: item_tax,
        line_total,
      };
    });

    const total_amount = subtotal + tax_amount;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create invoice
      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          tenant_id, invoice_number, invoice_type, customer_id, issue_date, due_date,
          currency, exchange_rate, subtotal, tax_amount, total_amount,
          payment_method, payment_terms, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')
        RETURNING *`,
        [
          req.tenantId,
          data.invoice_number,
          data.invoice_type,
          data.customer_id,
          data.issue_date,
          data.due_date,
          data.currency,
          data.exchange_rate,
          subtotal,
          tax_amount,
          total_amount,
          data.payment_method,
          data.payment_terms,
        ]
      );

      const invoice = invoiceResult.rows[0];

      // Create invoice items
      for (const item of itemsWithTotals) {
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id, product_id, description, quantity, unit_price,
            tax_type, tax_rate, tax_amount, tax_exemption_reason, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            invoice.id,
            item.product_id,
            item.description,
            item.quantity,
            item.unit_price,
            item.tax_type,
            item.tax_rate,
            item.tax_amount,
            item.tax_exemption_reason,
            item.line_total,
          ]
        );
      }

      // Create tax summary
      const taxSummary = new Map<string, { taxable_amount: number; tax_amount: number }>();

      for (const item of itemsWithTotals) {
        const key = `${item.tax_type}-${item.tax_rate}`;
        if (!taxSummary.has(key)) {
          taxSummary.set(key, { taxable_amount: 0, tax_amount: 0 });
        }
        const summary = taxSummary.get(key)!;
        summary.taxable_amount += item.line_total;
        summary.tax_amount += item.tax_amount;
      }

      for (const [key, summary] of taxSummary) {
        const [tax_type, tax_rate] = key.split('-');
        await client.query(
          `INSERT INTO invoice_tax_summary (
            invoice_id, tax_type, tax_rate, taxable_amount, tax_amount
          ) VALUES ($1, $2, $3, $4, $5)`,
          [invoice.id, tax_type, parseFloat(tax_rate), summary.taxable_amount, summary.tax_amount]
        );
      }

      await client.query('COMMIT');

      // Fetch complete invoice with items
      const completeInvoice = await pool.query(
        `SELECT i.*,
          json_agg(ii.*) as items
         FROM invoices i
         LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
         WHERE i.id = $1
         GROUP BY i.id`,
        [invoice.id]
      );

      res.status(201).json(completeInvoice.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = `
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.tenant_id = $1 AND i.deleted_at IS NULL
    `;
    const params: any[] = [req.tenantId];

    if (status) {
      query += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND deleted_at IS NULL',
      [req.tenantId]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.*,
        json_agg(json_build_object(
          'id', ii.id,
          'product_id', ii.product_id,
          'description', ii.description,
          'quantity', ii.quantity,
          'unit_price', ii.unit_price,
          'tax_type', ii.tax_type,
          'tax_rate', ii.tax_rate,
          'tax_amount', ii.tax_amount,
          'line_total', ii.line_total
        )) as items,
        c.name as customer_name,
        c.email as customer_email
       FROM invoices i
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL
       GROUP BY i.id, c.name, c.email`,
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    // Only allow deleting draft invoices
    const result = await pool.query(
      `UPDATE invoices SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'draft' AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Invoice not found or cannot be deleted');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:id/submit', async (req: AuthRequest, res, next) => {
  try {
    // Validate invoice can be submitted
    const result = await pool.query(
      `SELECT id, status FROM invoices
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    const invoice = result.rows[0];

    if (invoice.status !== 'draft' && invoice.status !== 'validated') {
      throw new ValidationError('Invoice cannot be submitted in current status');
    }

    // Update status to validated
    await pool.query(
      `UPDATE invoices SET status = 'validated' WHERE id = $1`,
      [req.params.id]
    );

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
