import mongoose from 'mongoose';
import { PosAppointment } from '../PosAppointment';

describe('PosAppointment Model', () => {
  it('should create an appointment', async () => {
    const appointmentData = {
      tenant_id: new mongoose.Types.ObjectId(),
      customer_id: new mongoose.Types.ObjectId(),
      appointment_date: new Date('2026-05-20'),
      start_time: '09:00',
      end_time: '10:00',
      service_type: 'haircut',
      service_items: [{ description: 'Haircut', price: 50 }],
      status: 'pending' as const,
      reminder_sent: false,
    };

    const appointment = await PosAppointment.create(appointmentData);
    expect(appointment.service_type).toBe('haircut');
    expect(appointment.status).toBe('pending');
  });
});
