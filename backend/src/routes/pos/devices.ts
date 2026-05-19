import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { extractTenant } from '../../middleware/tenant';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import { PosDevice, TenantPosSettings, Tenant, Product, Customer } from '../../models';
import { config } from '../../config/env';

const router = Router();

// Generate pairing code (authenticated - admin only)
router.post('/', authenticateJWT, extractTenant, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      device_name: z.string().min(1).max(100),
      device_type: z.enum(['tablet', 'desktop']),
    });

    const data = schema.parse(req.body);

    // Generate 6-character alphanumeric code
    const pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const device = await PosDevice.create({
      device_id: `temp-${Date.now()}`,
      tenant_id: req.tenantId,
      device_name: data.device_name,
      device_type: data.device_type,
      pairing_code: pairingCode,
      pairing_code_expires_at: expiresAt,
      status: 'pending',
    });

    res.status(201).json({
      device_id: device.device_id,
      device_name: device.device_name,
      pairing_code: pairingCode,
      expires_at: expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Pair device (unauthenticated - uses pairing code)
router.post('/pair', async (req, res, next) => {
  try {
    const schema = z.object({
      pairing_code: z.string().length(6),
      device_info: z.object({
        device_id: z.string(),
        os: z.string().optional(),
      }),
    });

    const data = schema.parse(req.body);

    // Find device with valid pairing code
    const device = await PosDevice.findOne({
      pairing_code: data.pairing_code,
      pairing_code_expires_at: { $gt: new Date() },
      status: 'pending',
    });

    if (!device) {
      throw new UnauthorizedError('Invalid or expired pairing code');
    }

    // Update device
    device.device_id = data.device_info.device_id;
    device.status = 'active';
    device.activated_at = new Date();
    device.pairing_code = undefined;
    device.pairing_code_expires_at = undefined;

    // Generate device token (30 days)
    const deviceToken = jwt.sign(
      {
        device_id: device.device_id,
        tenant_id: device.tenant_id.toString(),
        type: 'device',
      },
      config.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    device.device_token = deviceToken;
    await device.save();

    // Get tenant info
    const tenant = await Tenant.findById(device.tenant_id);

    // Get POS settings (or create default)
    let settings = await TenantPosSettings.findOne({ tenant_id: device.tenant_id });
    if (!settings) {
      settings = await TenantPosSettings.create({ tenant_id: device.tenant_id });
    }

    // Get initial data
    const products = await Product.find({ tenant_id: device.tenant_id, deleted_at: null }).limit(
      100
    );
    const customers = await Customer.find({ tenant_id: device.tenant_id, deleted_at: null }).limit(
      100
    );

    res.json({
      device_token: deviceToken,
      tenant_info: {
        tenant_id: tenant?._id,
        name: tenant?.company_name,
      },
      settings: settings,
      initial_data: {
        products: products,
        customers: customers,
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

// Get all devices (authenticated)
router.get('/', authenticateJWT, extractTenant, async (req: AuthRequest, res, next) => {
  try {
    const devices = await PosDevice.find({ tenant_id: req.tenantId }).sort({ created_at: -1 });
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

// Deactivate device (authenticated)
router.delete('/:id', authenticateJWT, extractTenant, async (req: AuthRequest, res, next) => {
  try {
    const device = await PosDevice.findOne({ _id: req.params.id, tenant_id: req.tenantId });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    device.status = 'inactive';
    device.device_token = undefined;
    await device.save();

    res.json({ message: 'Device deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
