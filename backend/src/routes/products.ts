import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Product } from '../models';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive().optional(), // Frontend field name
  unit_price: z.number().positive().optional(), // Backend field name
  classificationCode: z.string().optional(), // Frontend field name
  tax_type: z.enum(['SST', 'E', 'Z', 'SR']).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  tax_exemption_reason: z.string().max(200).optional(),
  barcode: z.string().max(50).optional(),
  stock_quantity: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
  unit: z.string().max(20).optional(),
}).refine(
  (data) => {
    // Accept either price or unit_price
    const hasPrice = data.price !== undefined || data.unit_price !== undefined;
    return hasPrice;
  },
  { message: 'Price is required' }
);

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    // Map frontend fields to backend fields
    const unitPrice = data.unit_price || data.price;
    const classificationCode = data.classificationCode || '001'; // Default classification

    // Default tax settings (SST 6%)
    const taxType = data.tax_type || 'SST';
    const taxRate = data.tax_rate !== undefined ? data.tax_rate : 6;

    const product = await Product.create({
      tenant_id: req.tenantId,
      name: data.name,
      description: data.description,
      unit_price: unitPrice,
      tax_type: taxType,
      tax_rate: taxRate,
      tax_exemption_reason: data.tax_exemption_reason,
      classificationCode: classificationCode,
      barcode: data.barcode,
      stock_quantity: data.stock_quantity || 0,
      reorder_level: data.reorder_level || 0,
      unit: data.unit,
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

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find({
        tenant_id: req.tenantId,
        deleted_at: null,
      })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments({
        tenant_id: req.tenantId,
        deleted_at: null,
      }),
    ]);

    res.json({
      data: products,
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
    const product = await Product.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    // Map frontend fields to backend fields
    const unitPrice = data.unit_price || data.price;
    const taxType = data.tax_type || 'SST';
    const taxRate = data.tax_rate !== undefined ? data.tax_rate : 6;

    const updateData: any = {
      name: data.name,
      description: data.description,
      unit_price: unitPrice,
      tax_type: taxType,
      tax_rate: taxRate,
      tax_exemption_reason: data.tax_exemption_reason,
      classificationCode: data.classificationCode,
    };

    // Add optional fields if provided
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.stock_quantity !== undefined) updateData.stock_quantity = data.stock_quantity;
    if (data.reorder_level !== undefined) updateData.reorder_level = data.reorder_level;
    if (data.unit !== undefined) updateData.unit = data.unit;

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant_id: req.tenantId,
        deleted_at: null,
      },
      updateData,
      { new: true }
    );

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant_id: req.tenantId,
        deleted_at: null,
      },
      { deleted_at: new Date() },
      { new: true }
    );

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
