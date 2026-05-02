// backend/src/routes/customers.ts
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const customerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(100).optional(),
  phone: z.string().max(20).optional(),
  registration_no: z.string().min(1).max(50),
  id_type: z.enum(['NRIC', 'PASSPORT', 'BRN', 'ARMY']),
  tin_number: z.string().length(12).optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  postcode: z.string().max(10).optional(),
  state_code: z.string().length(2).optional(),
  country_code: z.string().length(2).default('MY'),
  customer_type: z.enum(['B2B', 'B2C']),
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = customerSchema.parse(req.body);

    // Validate B2B requirements
    if (data.customer_type === 'B2B') {
      if (!data.tin_number) {
        throw new ValidationError('TIN number is required for B2B customers');
      }
      if (!data.address_line1) {
        throw new ValidationError('Address is required for B2B customers');
      }
    }

    const result = await pool.query(
      `INSERT INTO customers (
        tenant_id, name, email, phone, registration_no, id_type, tin_number,
        address_line1, address_line2, city, postcode, state_code, country_code, customer_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        req.tenantId,
        data.name,
        data.email,
        data.phone,
        data.registration_no,
        data.id_type,
        data.tin_number,
        data.address_line1,
        data.address_line2,
        data.city,
        data.postcode,
        data.state_code,
        data.country_code,
        data.customer_type,
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
    const search = req.query.search as string;

    let query = `
      SELECT * FROM customers
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `;
    const params: any[] = [req.tenantId];

    if (search) {
      query += ` AND (name ILIKE $2 OR email ILIKE $2)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL',
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
      'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = customerSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE customers SET
        name = $1, email = $2, phone = $3, registration_no = $4, id_type = $5,
        tin_number = $6, address_line1 = $7, address_line2 = $8, city = $9,
        postcode = $10, state_code = $11, country_code = $12, customer_type = $13,
        updated_at = NOW()
      WHERE id = $14 AND tenant_id = $15 AND deleted_at IS NULL
      RETURNING *`,
      [
        data.name, data.email, data.phone, data.registration_no, data.id_type,
        data.tin_number, data.address_line1, data.address_line2, data.city,
        data.postcode, data.state_code, data.country_code, data.customer_type,
        req.params.id, req.tenantId,
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Customer not found');
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
      'UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
