import { Router } from 'express';
import InvoiceTemplate from '../models/InvoiceTemplate';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

// Apply authentication and tenant extraction to all routes
router.use(authenticateJWT);
router.use(extractTenant);

// Get all templates
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const templates = await InvoiceTemplate.find({
      tenant_id: req.tenantId,
      deleted_at: null
    } as any).sort({ created_at: -1 });

    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// Get template by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const template = await InvoiceTemplate.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null
    } as any);

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    res.json(template);
  } catch (error) {
    next(error);
  }
});

// Create new template
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { name, description, invoice_type, payment_method, items, notes } = req.body;

    // Validation
    if (!name || !name.trim()) {
      throw new ValidationError('Template name is required');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('At least one item is required');
    }

    // Validate items
    for (const item of items) {
      if (!item.description || !item.description.trim()) {
        throw new ValidationError('Item description is required');
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new ValidationError('Item quantity must be a positive number');
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        throw new ValidationError('Item unit price must be a non-negative number');
      }
      if (!item.tax_type) {
        throw new ValidationError('Item tax type is required');
      }
      if (typeof item.tax_rate !== 'number' || item.tax_rate < 0 || item.tax_rate > 100) {
        throw new ValidationError('Item tax rate must be between 0 and 100');
      }
    }

    const template = new InvoiceTemplate({
      tenant_id: req.tenantId,
      name: name.trim(),
      description: description?.trim(),
      invoice_type: invoice_type || '01',
      payment_method: payment_method?.trim(),
      items,
      notes: notes?.trim()
    });

    await template.save();

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

// Update template
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { name, description, invoice_type, payment_method, items, notes } = req.body;

    const template = await InvoiceTemplate.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null
    } as any);

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Validation
    if (name !== undefined) {
      if (!name.trim()) {
        throw new ValidationError('Template name cannot be empty');
      }
      template.name = name.trim();
    }

    if (description !== undefined) {
      template.description = description?.trim();
    }

    if (invoice_type !== undefined) {
      template.invoice_type = invoice_type;
    }

    if (payment_method !== undefined) {
      template.payment_method = payment_method?.trim();
    }

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        throw new ValidationError('At least one item is required');
      }

      // Validate items
      for (const item of items) {
        if (!item.description || !item.description.trim()) {
          throw new ValidationError('Item description is required');
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          throw new ValidationError('Item quantity must be a positive number');
        }
        if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
          throw new ValidationError('Item unit price must be a non-negative number');
        }
        if (!item.tax_type) {
          throw new ValidationError('Item tax type is required');
        }
        if (typeof item.tax_rate !== 'number' || item.tax_rate < 0 || item.tax_rate > 100) {
          throw new ValidationError('Item tax rate must be between 0 and 100');
        }
      }

      template.items = items;
    }

    if (notes !== undefined) {
      template.notes = notes?.trim();
    }

    await template.save();

    res.json(template);
  } catch (error) {
    next(error);
  }
});

// Delete template (soft delete)
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const template = await InvoiceTemplate.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant_id: req.tenantId,
        deleted_at: null
      } as any,
      { deleted_at: new Date() },
      { returnDocument: 'after' }
    );

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
