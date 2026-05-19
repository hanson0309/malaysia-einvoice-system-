import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { extractTenant } from '../../middleware/tenant';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { Product } from '../../models';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  unit_price: z.number().positive(),
  tax_type: z.enum(['SST', 'E', 'Z', 'SR']),
  tax_rate: z.number().min(0).max(100),
  tax_exemption_reason: z.string().max(200).optional(),
  barcode: z.string().max(50).optional(),
  stock_quantity: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
  batch_number: z.string().max(50).optional(),
  expiry_date: z.string().optional(),
  cost_price: z.number().positive().optional(),
});

// Get products (with optional barcode search)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const filters: any = { tenant_id: req.tenantId, deleted_at: null };

    // If barcode is provided, search for specific product
    if (req.query.barcode) {
      const product = await Product.findOne({
        ...filters,
        barcode: req.query.barcode as string,
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return res.json(product);
    }

    // Otherwise, list all products
    const products = await Product.find(filters).sort({ created_at: -1 }).limit(100);

    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Create product
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    const product = await Product.create({
      tenant_id: req.tenantId,
      name: data.name,
      description: data.description,
      sku: data.sku,
      unit_price: data.unit_price,
      tax_type: data.tax_type,
      tax_rate: data.tax_rate,
      tax_exemption_reason: data.tax_exemption_reason,
      barcode: data.barcode,
      stock_quantity: data.stock_quantity || 0,
      reorder_level: data.reorder_level || 0,
      batch_number: data.batch_number,
      expiry_date: data.expiry_date ? new Date(data.expiry_date) : undefined,
      cost_price: data.cost_price,
    });

    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Update product
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const updateSchema = productSchema.partial();
    const data = updateSchema.parse(req.body);

    const product = await Product.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Update fields
    Object.assign(product, data);

    if (data.expiry_date) {
      product.expiry_date = new Date(data.expiry_date);
    }

    await product.save();

    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

export default router;
