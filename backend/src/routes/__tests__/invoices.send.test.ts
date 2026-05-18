import request from 'supertest';
import { app } from '../../app';
import { Invoice, Customer, InvoiceSending, Tenant } from '../../models';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import mongoose from 'mongoose';
import { EmailService } from '../../services/EmailService';
import { WhatsAppService } from '../../services/WhatsAppService';

// Mock the services
jest.mock('../../services/EmailService');
jest.mock('../../services/WhatsAppService');

describe('POST /api/v1/invoices/:id/send', () => {
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

    // Create test user ID
    userId = new mongoose.Types.ObjectId().toString();

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

    // Mock EmailService
    const mockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
    mockEmailService.prototype.sendInvoice = jest.fn().mockResolvedValue({ success: true });

    // Mock WhatsAppService
    (WhatsAppService.generateInvoiceLink as jest.Mock) = jest.fn().mockReturnValue(
      'https://wa.me/60123456789?text=Invoice%20INV-001'
    );
  });

  afterEach(async () => {
    // Clean up
    await Customer.deleteMany({});
    await Invoice.deleteMany({});
    await InvoiceSending.deleteMany({});
    await Tenant.deleteMany({});
    jest.clearAllMocks();
  });

  it('should send invoice via email', async () => {
    const response = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/send`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        send_method: 'email',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email_sent).toBe(true);

    const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
    expect(sendingRecord).toBeTruthy();
    expect(sendingRecord?.email_status).toBe('sent');
  });

  it('should generate WhatsApp link', async () => {
    const response = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/send`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        send_method: 'whatsapp',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.whatsapp_link).toMatch(/^https:\/\/wa\.me\//);
  });
});
