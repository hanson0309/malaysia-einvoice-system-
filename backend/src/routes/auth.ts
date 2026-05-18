// backend/src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/env';
import { ValidationError, UnauthorizedError, DuplicateError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Tenant, User } from '../models';
import { irbService } from '../services/irbService';

const router = Router();

const registerSchema = z.object({
  entity_type: z.enum(['individual', 'company']),
  company_name: z.string().min(1).max(200),
  company_registration_no: z.string().min(1).max(50),
  tin_number: z.string().min(1).max(20),
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
  myinvois_client_id: z.string().min(1).max(255),
  myinvois_client_secret: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });

    if (existingUser) {
      throw new DuplicateError('Email already registered');
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 12);

    // Convert entity_type to type: 1 = individual, 2 = company
    const type = data.entity_type === 'individual' ? 1 : 2;

    // Create tenant
    const tenant = await Tenant.create({
      type,
      company_name: data.company_name,
      company_registration_no: data.company_registration_no,
      tin_number: data.tin_number,
      sst_registration_no: data.sst_registration_no,
      business_activity_code: data.business_activity_code,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      postcode: data.postcode,
      state_code: data.state_code,
      country_code: data.country_code,
      email: data.email,
      phone: data.phone,
    });

    // Save MyInvois credentials (encrypted)
    tenant.myinvois_client_id = data.myinvois_client_id;
    tenant.myinvois_client_secret = irbService.encrypt(
      data.myinvois_client_secret,
      tenant._id.toString()
    );
    await tenant.save();

    // Create admin user
    const user = await User.create({
      tenant_id: tenant._id,
      email: data.email,
      password_hash,
      role: 'admin',
    });

    // Generate tokens
    const access_token = jwt.sign(
      {
        user_id: user._id.toString(),
        tenant_id: tenant._id.toString(),
        email: user.email,
        role: user.role,
      },
      config.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refresh_token = jwt.sign(
      { user_id: user._id.toString() },
      config.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    logger.info('New tenant registered', { tenant_id: tenant._id, email: data.email, type });

    res.status(201).json({
      access_token,
      refresh_token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenant_id: tenant._id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({
      email: data.email,
      deleted_at: null,
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const access_token = jwt.sign(
      {
        user_id: user._id.toString(),
        tenant_id: user.tenant_id.toString(),
        email: user.email,
        role: user.role,
      },
      config.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refresh_token = jwt.sign(
      { user_id: user._id.toString() },
      config.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    logger.info('User logged in', { user_id: user._id, email: user.email });

    res.json({
      access_token,
      refresh_token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

export default router;
