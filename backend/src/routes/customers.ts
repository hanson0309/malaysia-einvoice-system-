// backend/src/routes/customers.ts
import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Customer } from '../models';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const customerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(100).optional(),
  phone: z.string().max(20).optional(),
  registration_no: z.string().min(1).max(50),
  id_type: z.enum(['NRIC', 'PASSPORT', 'BRN', 'ARMY']),
  tin_number: z.string().min(11).max(13).optional(),
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
    console.log('Received customer data:', JSON.stringify(req.body, null, 2));
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

    const customer = await Customer.create({
      tenant_id: req.tenantId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      registration_no: data.registration_no,
      id_type: data.id_type,
      tin_number: data.tin_number,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      postcode: data.postcode,
      state_code: data.state_code,
      country_code: data.country_code,
      customer_type: data.customer_type,
    });

    res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', JSON.stringify(error.issues, null, 2));
      const errorMessages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      next(new ValidationError(`Validation failed: ${errorMessages}`, undefined, error.issues));
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
    const search = req.query.search as string;

    const query: any = {
      tenant_id: req.tenantId,
      deleted_at: null,
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(query),
    ]);

    res.json({
      data: customers,
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
    const customer = await Customer.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = customerSchema.parse(req.body);

    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant_id: req.tenantId,
        deleted_at: null,
      },
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        registration_no: data.registration_no,
        id_type: data.id_type,
        tin_number: data.tin_number,
        address_line1: data.address_line1,
        address_line2: data.address_line2,
        city: data.city,
        postcode: data.postcode,
        state_code: data.state_code,
        country_code: data.country_code,
        customer_type: data.customer_type,
      },
      { new: true }
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.json(customer);
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
    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant_id: req.tenantId,
        deleted_at: null,
      },
      { deleted_at: new Date() },
      { new: true }
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
