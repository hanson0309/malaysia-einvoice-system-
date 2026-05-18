import request from 'supertest';
import { app } from '../../app';
import { Invoice, Customer, InvoiceSending, Tenant, User } from '../../models';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import mongoose from 'mongoose';

describe('GET /api/v1/invoices/:id/sending-history', () => {
  let authToken: string;
  let invoiceId: string;
  let customerId: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/test-einvoice');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections
    await Customer.deleteMany({});
    await Invoice.deleteMany({});
    await InvoiceSending.deleteMany({});
    await Tenant.deleteMany({});
    await User.deleteMany({});

    // Create test tenant
    const tenant = await Tenant.create({
      type: 2,
      company_name: 'Test Company',
      company_registration_no: 'REG123',
      tin_number: 'TIN123',
      business_activity_code: 'BIZ001',
      email: 'company@example.com',
      phone: '011-1111-1111',
      address_line1: '123 Test St',
      city: 'Kuala Lumpur',
      postcode: '50000',
      state_code: '14',
      country_code: 'MY',
    });
    tenantId = tenant._id.toString();

    // Create test user
    const user = await User.create({
      tenant_id: tenantId,
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'admin',
    });
    userId = user._id.toString();

    // Generate valid auth token
    authToken = jwt.sign(
      {
        user_id: userId,
        tenant_id: tenantId,
        email: 'test@example.com',
        role: 'admin',
      },
      config.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Setup test data
    const customer = await Customer.create({
      tenant_id: tenantId,
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '012-345-6789',
      registration_no: '123456',
      id_type: 'NRIC',
      customer_type: 'B2B',
    });
    customerId = customer._id.toString();

    const invoice = await Invoice.create({
      tenant_id: tenantId,
      invoice_number: 'INV-001',
      invoice_type: '01',
      customer_id: customerId,
      issue_date: new Date(),
      subtotal: 1000,
      tax_amount: 60,
      total_amount: 1060,
      items: [],
      status: 'draft',
    });
    invoiceId = invoice._id.toString();

    // Create sending history records
    await InvoiceSending.create({
      tenant_id: tenantId,
      invoice_id: invoiceId,
      customer_id: customerId,
      send_method: 'email',
      email_sent: true,
      email_sent_at: new Date('2024-01-01'),
      email_status: 'sent',
      email_to: 'customer@example.com',
      whatsapp_link_generated: false,
      whatsapp_phone: '012-345-6789',
      sent_by: userId,
    });

    await InvoiceSending.create({
      tenant_id: tenantId,
      invoice_id: invoiceId,
      customer_id: customerId,
      send_method: 'whatsapp',
      email_sent: false,
      email_status: 'pending',
      email_to: 'customer@example.com',
      whatsapp_link_generated: true,
      whatsapp_link: 'https://wa.me/60123456789',
      whatsapp_phone: '012-345-6789',
      sent_by: userId,
    });
  });

  afterEach(async () => {
    // Clean up
    await Customer.deleteMany({});
    await Invoice.deleteMany({});
    await InvoiceSending.deleteMany({});
    await Tenant.deleteMany({});
    await User.deleteMany({});
  });

  it('should return sending history for invoice', async () => {
    const response = await request(app)
      .get(`/api/v1/invoices/${invoiceId}/sending-history`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(2);
  });

  it('should populate sent_by user information', async () => {
    const response = await request(app)
      .get(`/api/v1/invoices/${invoiceId}/sending-history`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0].sent_by).toBeDefined();
    expect(response.body.data[0].sent_by.email).toBe('test@example.com');
  });

  it('should return history sorted by created_at descending', async () => {
    const response = await request(app)
      .get(`/api/v1/invoices/${invoiceId}/sending-history`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    const data = response.body.data;

    // Verify newest first (whatsapp was created after email)
    expect(data[0].send_method).toBe('whatsapp');
    expect(data[1].send_method).toBe('email');
  });

  it('should return 404 for non-existent invoice', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
      .get(`/api/v1/invoices/${fakeId}/sending-history`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(404);
  });

  it('should not return history from other tenants', async () => {
    // Create another tenant and invoice
    const otherTenant = await Tenant.create({
      type: 2,
      company_name: 'Other Company',
      company_registration_no: 'REG999',
      tin_number: 'TIN999',
      business_activity_code: 'BIZ999',
      email: 'other@example.com',
      phone: '011-9999-9999',
      address_line1: '999 Other St',
      city: 'Kuala Lumpur',
      postcode: '50000',
      state_code: '14',
      country_code: 'MY',
    });

    const response = await request(app)
      .get(`/api/v1/invoices/${invoiceId}/sending-history`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    // Should only return records from current tenant
    expect(response.body.data.length).toBe(2);
  });
});
