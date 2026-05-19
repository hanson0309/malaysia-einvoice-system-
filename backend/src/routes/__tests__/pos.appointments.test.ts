import request from 'supertest';
import { app } from '../../app';
import { PosAppointment, Customer } from '../../models';
import mongoose from 'mongoose';

describe('GET /api/v1/pos/appointments', () => {
  let validToken: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
  });

  it('should list all appointments', async () => {
    const response = await request(app)
      .get('/api/v1/pos/appointments')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should filter appointments by date', async () => {
    const response = await request(app)
      .get('/api/v1/pos/appointments')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ date: '2026-05-20' })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('POST /api/v1/pos/appointments', () => {
  let validToken: string;
  let testTenantId: string;
  let customerId: string;

  beforeAll(async () => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();

    const customer = await Customer.create({
      tenant_id: testTenantId,
      name: 'Test Customer',
      registration_no: '123456789',
      id_type: 'NRIC',
      customer_type: 'B2C',
    });
    customerId = customer._id.toString();
  });

  it('should create a new appointment', async () => {
    const response = await request(app)
      .post('/api/v1/pos/appointments')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        customer_id: customerId,
        appointment_date: '2026-05-25',
        start_time: '10:00',
        end_time: '11:00',
        service_type: 'Consultation',
        service_items: [
          { description: 'Initial consultation', price: 100 },
          { description: 'Follow-up', price: 50 },
        ],
        notes: 'First visit',
      })
      .expect(201);

    expect(response.body.customer_id).toBe(customerId);
    expect(response.body.status).toBe('pending');
  });
});

describe('PUT /api/v1/pos/appointments/:id', () => {
  let validToken: string;
  let testTenantId: string;
  let appointmentId: string;

  beforeAll(async () => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();

    const appointment = await PosAppointment.create({
      tenant_id: testTenantId,
      customer_id: new mongoose.Types.ObjectId(),
      appointment_date: new Date('2026-05-25'),
      start_time: '10:00',
      end_time: '11:00',
      service_type: 'Consultation',
      service_items: [{ description: 'Test', price: 100 }],
      status: 'pending',
    });
    appointmentId = appointment._id.toString();
  });

  it('should update an appointment', async () => {
    const response = await request(app)
      .put(`/api/v1/pos/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        status: 'confirmed',
        notes: 'Confirmed by phone',
      })
      .expect(200);

    expect(response.body.status).toBe('confirmed');
    expect(response.body.notes).toBe('Confirmed by phone');
  });
});

describe('DELETE /api/v1/pos/appointments/:id', () => {
  let validToken: string;
  let testTenantId: string;
  let appointmentId: string;

  beforeAll(async () => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();

    const appointment = await PosAppointment.create({
      tenant_id: testTenantId,
      customer_id: new mongoose.Types.ObjectId(),
      appointment_date: new Date('2026-05-25'),
      start_time: '10:00',
      end_time: '11:00',
      service_type: 'Consultation',
      service_items: [{ description: 'Test', price: 100 }],
      status: 'pending',
    });
    appointmentId = appointment._id.toString();
  });

  it('should cancel an appointment', async () => {
    const response = await request(app)
      .delete(`/api/v1/pos/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.message).toBe('Appointment cancelled');
  });
});
