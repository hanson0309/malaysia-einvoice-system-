import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { extractTenant } from '../../middleware/tenant';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { PosTransaction, Invoice } from '../../models';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const transactionItemSchema = z.object({
  product_id: z.string().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  tax_type: z.enum(['SST', 'E', 'Z', 'SR']),
  tax_rate: z.number().min(0).max(100),
  tax_amount: z.number(),
  line_total: z.number(),
});

const transactionSchema = z.object({
  transaction_id: z.string(),
  transaction_number: z.string(),
  transaction_date: z.string(),
  cashier_id: z.string(),
  customer_id: z.string().optional(),
  items: z.array(transactionItemSchema).min(1),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  payment_method: z.enum(['cash', 'card', 'ewallet']),
  payment_status: z.enum(['paid', 'partial', 'refund']),
  device_id: z.string(),
});

// Sync transactions (batch)
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      transactions: z.array(transactionSchema).min(1).max(50),
    });

    const data = schema.parse(req.body);
    let synced = 0;

    for (const txn of data.transactions) {
      // Check if already exists (idempotency)
      const existing = await PosTransaction.findOne({ transaction_id: txn.transaction_id });
      if (existing) continue;

      await PosTransaction.create({
        ...txn,
        tenant_id: req.tenantId,
        transaction_date: new Date(txn.transaction_date),
        synced_at: new Date(),
      });
      synced++;
    }

    res.json({ synced, total: data.transactions.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Get transactions
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const filters: any = { tenant_id: req.tenantId };

    if (req.query.start_date && req.query.end_date) {
      filters.transaction_date = {
        $gte: new Date(req.query.start_date as string),
        $lte: new Date(req.query.end_date as string),
      };
    }

    const transactions = await PosTransaction.find(filters)
      .sort({ transaction_date: -1 })
      .limit(100);

    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

export default router;
