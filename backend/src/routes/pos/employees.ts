import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { extractTenant } from '../../middleware/tenant';
import { ValidationError, UnauthorizedError } from '../../utils/errors';
import { User } from '../../models';
import { config } from '../../config/env';

const router = Router();

// PIN login (unauthenticated - for POS devices)
router.post('/pin-login', async (req, res, next) => {
  try {
    const schema = z.object({
      employee_code: z.string().min(1).max(50),
      pin: z.string().min(4).max(6),
    });

    const data = schema.parse(req.body);

    // Find employee by code
    const employee = await User.findOne({
      employee_code: data.employee_code,
      deleted_at: null,
    });

    if (!employee) {
      throw new UnauthorizedError('Invalid employee code or PIN');
    }

    // Check if employee is active
    if (employee.active_status !== 'active') {
      throw new UnauthorizedError('Employee account is inactive');
    }

    // Verify PIN
    if (!employee.pin_code) {
      throw new UnauthorizedError('PIN not set for this employee');
    }

    const isPinValid = await bcrypt.compare(data.pin, employee.pin_code);
    if (!isPinValid) {
      throw new UnauthorizedError('Invalid employee code or PIN');
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: employee._id.toString(),
        tenantId: employee.tenant_id.toString(),
        role: employee.role,
        type: 'employee',
      },
      config.JWT_SECRET!,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      employee: {
        id: employee._id,
        employee_code: employee.employee_code,
        email: employee.email,
        role: employee.role,
        tenant_id: employee.tenant_id,
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

// Get employees (authenticated)
router.get('/', authenticateJWT, extractTenant, async (req: AuthRequest, res, next) => {
  try {
    const filters: any = {
      tenant_id: req.tenantId,
      deleted_at: null,
    };

    // Filter by role
    if (req.query.role) {
      filters.role = req.query.role;
    }

    // Filter by active status
    if (req.query.active_status) {
      filters.active_status = req.query.active_status;
    }

    const employees = await User.find(filters)
      .select('-password_hash -pin_code')
      .sort({ created_at: -1 });

    res.json(employees);
  } catch (error) {
    next(error);
  }
});

export default router;
