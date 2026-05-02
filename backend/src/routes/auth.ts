// backend/src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/database';
import { config } from '../config/env';
import { ValidationError, UnauthorizedError, DuplicateError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

const registerSchema = z.object({
  company_name: z.string().min(1).max(200),
  company_registration_no: z.string().min(1).max(50),
  tin_number: z.string().length(12),
  business_activity_code: z.string().min(1).max(10),
  address_line1: z.string().min(1).max(200),
  address_line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postcode: z.string().min(1).max(10),
  state_code: z.string().length(2),
  country_code: z.string().length(2).default('MY'),
  email: z.string().email().max(100),
  phone: z.string().min(1).max(20),
  password: z.string().min(8).max(100),
  sst_registration_no: z.string().max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [data.email]
    );

    if (existingUser.rows.length > 0) {
      throw new DuplicateError('Email already registered');
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 12);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create tenant
      const tenantResult = await client.query(
        `INSERT INTO tenants (
          company_name, company_registration_no, tin_number, sst_registration_no,
          business_activity_code, address_line1, address_line2, city, postcode,
          state_code, country_code, email, phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          data.company_name,
          data.company_registration_no,
          data.tin_number,
          data.sst_registration_no,
          data.business_activity_code,
          data.address_line1,
          data.address_line2,
          data.city,
          data.postcode,
          data.state_code,
          data.country_code,
          data.email,
          data.phone,
        ]
      );

      const tenant_id = tenantResult.rows[0].id;

      // Create admin user
      const userResult = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, role, created_at`,
        [tenant_id, data.email, password_hash, 'admin']
      );

      await client.query('COMMIT');

      const user = userResult.rows[0];

      // Generate tokens
      const access_token = jwt.sign(
        {
          user_id: user.id,
          tenant_id,
          email: user.email,
          role: user.role,
        },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refresh_token = jwt.sign(
        { user_id: user.id },
        config.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      logger.info('New tenant registered', { tenant_id, email: data.email });

      res.status(201).json({
        access_token,
        refresh_token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenant_id,
        },
      });
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

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user
    const result = await pool.query(
      `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.role
       FROM users u
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [data.email]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const access_token = jwt.sign(
      {
        user_id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refresh_token = jwt.sign(
      { user_id: user.id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('User logged in', { user_id: user.id, email: user.email });

    res.json({
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

export default router;
