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
  unit: z.string().max(20).optional(),
  barcode: z.string().max(50).optional(),
  stock_quantity: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
  batch_number: z.string().max(50).optional(),
  expiry_date: z.string().optional(),
  cost_price: z.number().positive().optional(),
  image_url: z.string().max(500).optional(),
});

// Helper function to add is_active virtual field
function addIsActiveField(product: any) {
  return {
    ...product,
    is_active: product.deleted_at === null,
  };
}

// Get products (with optional barcode search, incremental sync, and pagination)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { search, barcode, updated_since, page = '1', limit = '100' } = req.query;
    const filters: any = { tenant_id: req.tenantId, deleted_at: null };

    // If barcode is provided, search for specific product
    if (barcode) {
      const product = await Product.findOne({
        ...filters,
        barcode: barcode as string,
      }).lean();

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return res.json({
        success: true,
        data: addIsActiveField(product),
      });
    }

    // Support incremental sync with updated_since parameter
    if (updated_since) {
      const updatedSince = new Date(updated_since as string);
      if (!isNaN(updatedSince.getTime())) {
        filters.updated_at = { $gt: updatedSince };
      }
    }

    // Support text search
    if (search) {
      filters.$text = { $search: search as string };
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 500); // Max 500
    const skip = (pageNum - 1) * limitNum;

    // Get total count and products
    const [total, products] = await Promise.all([
      Product.countDocuments(filters),
      Product.find(filters)
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    // Add is_active virtual field to all products
    const productsWithActive = products.map(addIsActiveField);

    res.json({
      success: true,
      data: productsWithActive,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
        has_next: skip + products.length < total,
      },
    });
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
      unit: data.unit,
      barcode: data.barcode,
      stock_quantity: data.stock_quantity || 0,
      reorder_level: data.reorder_level || 0,
      batch_number: data.batch_number,
      expiry_date: data.expiry_date ? new Date(data.expiry_date) : undefined,
      cost_price: data.cost_price,
      image_url: data.image_url,
    });

    res.status(201).json({
      success: true,
      data: addIsActiveField(product.toObject()),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Get single product by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    }).lean();

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      data: addIsActiveField(product),
    });
  } catch (error) {
    next(error);
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

    res.json({
      success: true,
      data: addIsActiveField(product.toObject()),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Delete product (soft delete)
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

    res.json({
      success: true,
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
