import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { extractTenant } from '../../middleware/tenant';
import { ValidationError } from '../../utils/errors';
import { TenantPosSettings } from '../../models';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const settingsSchema = z.object({
  modules: z
    .object({
      appointment: z.boolean(),
      inventory: z.boolean(),
      multi_cashier: z.boolean(),
      customer_management: z.boolean(),
    })
    .optional(),
  business_type: z.enum(['retail', 'service', 'both']).optional(),
  invoice_settings: z
    .object({
      auto_create_on_payment: z.boolean(),
      default_invoice_type: z.enum(['01', '02']),
      require_customer_for_invoice: z.boolean(),
    })
    .optional(),
  hardware: z
    .object({
      receipt_printer_enabled: z.boolean(),
      barcode_scanner_enabled: z.boolean(),
      cash_drawer_enabled: z.boolean(),
      label_printer_enabled: z.boolean(),
    })
    .optional(),
});

// Get POS settings
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    let settings = await TenantPosSettings.findOne({ tenant_id: req.tenantId });

    // Create default settings if none exist
    if (!settings) {
      settings = await TenantPosSettings.create({
        tenant_id: req.tenantId,
        modules: {
          appointment: false,
          inventory: true,
          multi_cashier: true,
          customer_management: true,
        },
        business_type: 'retail',
        invoice_settings: {
          auto_create_on_payment: true,
          default_invoice_type: '02',
          require_customer_for_invoice: false,
        },
        hardware: {
          receipt_printer_enabled: true,
          barcode_scanner_enabled: true,
          cash_drawer_enabled: false,
          label_printer_enabled: false,
        },
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Update POS settings
router.put('/', async (req: AuthRequest, res, next) => {
  try {
    const data = settingsSchema.parse(req.body);

    let settings = await TenantPosSettings.findOne({ tenant_id: req.tenantId });

    if (!settings) {
      // Create new settings if none exist
      settings = await TenantPosSettings.create({
        tenant_id: req.tenantId,
        ...data,
      });
    } else {
      // Update existing settings
      if (data.modules) {
        settings.modules = { ...settings.modules, ...data.modules };
      }
      if (data.business_type) {
        settings.business_type = data.business_type;
      }
      if (data.invoice_settings) {
        settings.invoice_settings = { ...settings.invoice_settings, ...data.invoice_settings };
      }
      if (data.hardware) {
        settings.hardware = { ...settings.hardware, ...data.hardware };
      }

      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

export default router;
