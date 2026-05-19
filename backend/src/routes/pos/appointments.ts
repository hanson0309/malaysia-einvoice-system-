import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { extractTenant } from '../../middleware/tenant';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { PosAppointment } from '../../models';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const serviceItemSchema = z.object({
  description: z.string().min(1).max(200),
  price: z.number().positive(),
});

const appointmentSchema = z.object({
  customer_id: z.string(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  service_type: z.string().min(1).max(100),
  service_items: z.array(serviceItemSchema).min(1),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  notes: z.string().max(500).optional(),
});

// Get appointments
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const filters: any = { tenant_id: req.tenantId };

    // Filter by date
    if (req.query.date) {
      const date = new Date(req.query.date as string);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      filters.appointment_date = {
        $gte: date,
        $lt: nextDay,
      };
    }

    // Filter by status
    if (req.query.status) {
      filters.status = req.query.status;
    }

    // Filter by customer
    if (req.query.customer_id) {
      filters.customer_id = req.query.customer_id;
    }

    const appointments = await PosAppointment.find(filters)
      .populate('customer_id', 'name phone email')
      .sort({ appointment_date: 1, start_time: 1 })
      .limit(100);

    res.json(appointments);
  } catch (error) {
    next(error);
  }
});

// Create appointment
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = appointmentSchema.parse(req.body);

    const appointment = await PosAppointment.create({
      tenant_id: req.tenantId,
      customer_id: data.customer_id,
      appointment_date: new Date(data.appointment_date),
      start_time: data.start_time,
      end_time: data.end_time,
      service_type: data.service_type,
      service_items: data.service_items,
      status: data.status || 'pending',
      notes: data.notes,
      reminder_sent: false,
    });

    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Update appointment
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const updateSchema = appointmentSchema.partial();
    const data = updateSchema.parse(req.body);

    const appointment = await PosAppointment.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // Update fields
    if (data.customer_id) appointment.customer_id = data.customer_id as any;
    if (data.appointment_date) appointment.appointment_date = new Date(data.appointment_date);
    if (data.start_time) appointment.start_time = data.start_time;
    if (data.end_time) appointment.end_time = data.end_time;
    if (data.service_type) appointment.service_type = data.service_type;
    if (data.service_items) appointment.service_items = data.service_items;
    if (data.status) appointment.status = data.status;
    if (data.notes !== undefined) appointment.notes = data.notes;

    await appointment.save();

    res.json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Cancel appointment (soft delete)
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const appointment = await PosAppointment.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    next(error);
  }
});

export default router;
