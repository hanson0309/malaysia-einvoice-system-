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
  sku: z.string().max(100).optional(),
  unit_price: z.number().positive(),
  tax_type: z.enum(['SST', 'E', 'Z', 'SR']),
  tax_rate: z.number().min(0).max(100),
  tax_exemption_reason: z.string().max(200).optional(),
}).refine(
  (data) => {
    if (data.tax_rate === 0 && !data.tax_exemption_reason) {
      return false;
    }
    return true;
  },
  { message: 'Tax exemption reason required when tax rate is 0' }
);

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

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant_id: req.tenantId,
        deleted_at: null,
      },
      {
        name: data.name,
        description: data.description,
        sku: data.sku,
        unit_price: data.unit_price,
        tax_type: data.tax_type,
        tax_rate: data.tax_rate,
        tax_exemption_reason: data.tax_exemption_reason,
      },
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
