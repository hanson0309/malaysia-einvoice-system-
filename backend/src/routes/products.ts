import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';

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

    const result = await pool.query(
      `INSERT INTO products (
        tenant_id, name, description, sku, unit_price, tax_type, tax_rate, tax_exemption_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.tenantId,
        data.name,
        data.description,
        data.sku,
        data.unit_price,
        data.tax_type,
        data.tax_rate,
        data.tax_exemption_reason,
      ]
    );

    res.status(201).json(result.rows[0]);
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

    const result = await pool.query(
      `SELECT * FROM products
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.tenantId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE tenant_id = $1 AND deleted_at IS NULL',
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
      'SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE products SET
        name = $1, description = $2, sku = $3, unit_price = $4,
        tax_type = $5, tax_rate = $6, tax_exemption_reason = $7, updated_at = NOW()
      WHERE id = $8 AND tenant_id = $9 AND deleted_at IS NULL
      RETURNING *`,
      [
        data.name, data.description, data.sku, data.unit_price,
        data.tax_type, data.tax_rate, data.tax_exemption_reason,
        req.params.id, req.tenantId,
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE products SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
