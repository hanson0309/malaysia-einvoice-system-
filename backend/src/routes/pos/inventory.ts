import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { extractTenant } from '../../middleware/tenant';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { Product, PosInventoryLog } from '../../models';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

// Adjust inventory (positive or negative)
router.post('/adjust', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      product_id: z.string(),
      quantity_change: z.number().int(),
      transaction_type: z.enum(['adjustment', 'stocktake']),
      reference_id: z.string().max(100).optional(),
      notes: z.string().max(500).optional(),
    });

    const data = schema.parse(req.body);

    const product = await Product.findOne({
      _id: data.product_id,
      tenant_id: req.tenantId,
      deleted_at: null,
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const beforeQuantity = product.stock_quantity || 0;
    const afterQuantity = beforeQuantity + data.quantity_change;

    if (afterQuantity < 0) {
      throw new ValidationError('Insufficient stock');
    }

    // Update product stock
    product.stock_quantity = afterQuantity;
    await product.save();

    // Log the transaction
    await PosInventoryLog.create({
      tenant_id: req.tenantId,
      product_id: data.product_id,
      transaction_type: data.transaction_type,
      quantity_change: data.quantity_change,
      before_quantity: beforeQuantity,
      after_quantity: afterQuantity,
      reference_id: data.reference_id,
      notes: data.notes,
      created_by: req.user?.user_id,
    });

    res.json({
      message: 'Inventory adjusted',
      new_quantity: afterQuantity,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Restock inventory (always positive)
router.post('/restock', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      product_id: z.string(),
      quantity: z.number().int().positive(),
      reference_id: z.string().max(100).optional(),
      notes: z.string().max(500).optional(),
    });

    const data = schema.parse(req.body);

    const product = await Product.findOne({
      _id: data.product_id,
      tenant_id: req.tenantId,
      deleted_at: null,
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const beforeQuantity = product.stock_quantity || 0;
    const afterQuantity = beforeQuantity + data.quantity;

    // Update product stock
    product.stock_quantity = afterQuantity;
    await product.save();

    // Log the transaction
    await PosInventoryLog.create({
      tenant_id: req.tenantId,
      product_id: data.product_id,
      transaction_type: 'purchase',
      quantity_change: data.quantity,
      before_quantity: beforeQuantity,
      after_quantity: afterQuantity,
      reference_id: data.reference_id,
      notes: data.notes,
      created_by: req.user?.user_id,
    });

    res.json({
      message: 'Inventory restocked',
      new_quantity: afterQuantity,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Get inventory logs
router.get('/logs', async (req: AuthRequest, res, next) => {
  try {
    const filters: any = { tenant_id: req.tenantId };

    if (req.query.product_id) {
      filters.product_id = req.query.product_id;
    }

    if (req.query.transaction_type) {
      filters.transaction_type = req.query.transaction_type;
    }

    const logs = await PosInventoryLog.find(filters)
      .populate('product_id', 'name sku barcode')
      .populate('created_by', 'name email')
      .sort({ created_at: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;
