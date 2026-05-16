// backend/tests/integration/invoices.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { Invoice, Customer, InvoiceSending } from '../../src/models';
import { EmailService } from '../../src/services/EmailService';
import { WhatsAppService } from '../../src/services/WhatsAppService';

// Mock the services
jest.mock('../../src/services/EmailService');
jest.mock('../../src/services/WhatsAppService');

describe('Invoice Send Endpoint', () => {
  let authToken: string;
  let tenantId: string;
  let customerId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // Register and get token
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        company_name: 'Test Company',
        company_registration_no: 'REG123',
        tin_number: '123456789012',
        business_activity_code: '12345',
        address_line1: '123 Test St',
        city: 'Kuala Lumpur',
        postcode: '50000',
        state_code: '14',
        email: 'test@example.com',
        phone: '+60123456789',
        password: 'SecurePass123!',
      });

    authToken = response.body.access_token;
    tenantId = response.body.user.tenant_id;
  });

  beforeEach(async () => {
    // Create a customer with email and phone
    const customerResponse = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '+60123456789',
        registration_no: '202301234567',
        id_type: 'BRN',
        tin_number: '123456789012',
        address_line1: '456 Business Ave',
        city: 'Kuala Lumpur',
        postcode: '50000',
        state_code: '14',
        customer_type: 'B2B',
      });

    customerId = customerResponse.body.id;

    // Create an invoice
    const invoiceResponse = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        invoice_number: 'INV-001',
        invoice_type: '01',
        classification: 'consolidated',
        issue_date: '2024-01-01',
        due_date: '2024-01-31',
        currency: 'MYR',
        items: [
          {
            description: 'Test Item',
            quantity: 1,
            unit_price: 100,
            tax_type: 'SST',
            tax_rate: 6,
          },
        ],
      });

    invoiceId = invoiceResponse.body._id;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up
    await InvoiceSending.deleteMany({ tenant_id: tenantId });
    await Invoice.deleteMany({ tenant_id: tenantId });
    await Customer.deleteMany({ tenant_id: tenantId });
  });

  describe('Email sending', () => {
    it('should send email successfully', async () => {
      // Mock successful email send
      (EmailService.prototype.sendInvoice as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'email',
          email_subject: 'Your Invoice',
          email_message: 'Please find your invoice attached.',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email_sent).toBe(true);
      expect(response.body.data.whatsapp_link).toBeUndefined();

      // Verify InvoiceSending record
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
      expect(sendingRecord).toBeTruthy();
      expect(sendingRecord?.email_sent).toBe(true);
      expect(sendingRecord?.email_status).toBe('sent');
    });

    it('should handle email failure gracefully', async () => {
      // Mock email send failure
      (EmailService.prototype.sendInvoice as jest.Mock).mockRejectedValue(
        new Error('SMTP connection failed')
      );

      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'email',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email_sent).toBe(false);

      // Verify InvoiceSending record has error
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
      expect(sendingRecord).toBeTruthy();
      expect(sendingRecord?.email_sent).toBe(false);
      expect(sendingRecord?.email_status).toBe('failed');
      expect(sendingRecord?.email_error_message).toBe('SMTP connection failed');
    });

    it('should reject email send when customer has no email', async () => {
      // Create customer without email
      const noEmailCustomer = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'No Email Customer',
          phone: '+60123456789',
          registration_no: '202301234568',
          id_type: 'BRN',
          tin_number: '123456789013',
          address_line1: '789 Business Ave',
          city: 'Kuala Lumpur',
          postcode: '50000',
          state_code: '14',
          customer_type: 'B2B',
        });

      // Create invoice for this customer
      const noEmailInvoice = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoice_number: 'INV-002',
          invoice_type: '01',
          classification: 'consolidated',
          issue_date: '2024-01-01',
          items: [
            {
              description: 'Test Item',
              quantity: 1,
              unit_price: 100,
              tax_type: 'SST',
              tax_rate: 6,
            },
          ],
        });

      const response = await request(app)
        .post(`/api/v1/invoices/${noEmailInvoice.body._id}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Customer email is missing');

      // Verify no InvoiceSending record was created
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: noEmailInvoice.body._id });
      expect(sendingRecord).toBeNull();
    });
  });

  describe('WhatsApp sending', () => {
    it('should generate WhatsApp link successfully', async () => {
      // Mock successful WhatsApp link generation
      (WhatsAppService.generateInvoiceLink as jest.Mock).mockReturnValue(
        'https://wa.me/60123456789?text=Invoice%20INV-001'
      );

      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'whatsapp',
          whatsapp_message: 'Your invoice is ready',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email_sent).toBe(false);
      expect(response.body.data.whatsapp_link).toBe('https://wa.me/60123456789?text=Invoice%20INV-001');

      // Verify InvoiceSending record
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
      expect(sendingRecord).toBeTruthy();
      expect(sendingRecord?.whatsapp_link_generated).toBe(true);
      expect(sendingRecord?.whatsapp_link).toBe('https://wa.me/60123456789?text=Invoice%20INV-001');
    });

    it('should handle WhatsApp link generation failure gracefully', async () => {
      // Mock WhatsApp link generation failure
      (WhatsAppService.generateInvoiceLink as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid phone number format');
      });

      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'whatsapp',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.whatsapp_link).toBeUndefined();

      // Verify InvoiceSending record has error
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
      expect(sendingRecord).toBeTruthy();
      expect(sendingRecord?.whatsapp_link_generated).toBe(false);
      expect(sendingRecord?.whatsapp_error_message).toBe('Invalid phone number format');
    });

    it('should reject WhatsApp send when customer has no phone', async () => {
      // Create customer without phone
      const noPhoneCustomer = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'No Phone Customer',
          email: 'nophone@example.com',
          registration_no: '202301234569',
          id_type: 'BRN',
          tin_number: '123456789014',
          address_line1: '789 Business Ave',
          city: 'Kuala Lumpur',
          postcode: '50000',
          state_code: '14',
          customer_type: 'B2B',
        });

      // Create invoice for this customer
      const noPhoneInvoice = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoice_number: 'INV-003',
          invoice_type: '01',
          classification: 'consolidated',
          issue_date: '2024-01-01',
          items: [
            {
              description: 'Test Item',
              quantity: 1,
              unit_price: 100,
              tax_type: 'SST',
              tax_rate: 6,
            },
          ],
        });

      const response = await request(app)
        .post(`/api/v1/invoices/${noPhoneInvoice.body._id}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'whatsapp',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Customer phone number is missing');

      // Verify no InvoiceSending record was created
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: noPhoneInvoice.body._id });
      expect(sendingRecord).toBeNull();
    });
  });

  describe('Both email and WhatsApp', () => {
    it('should send both email and WhatsApp successfully', async () => {
      // Mock successful operations
      (EmailService.prototype.sendInvoice as jest.Mock).mockResolvedValue(undefined);
      (WhatsAppService.generateInvoiceLink as jest.Mock).mockReturnValue(
        'https://wa.me/60123456789?text=Invoice%20INV-001'
      );

      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'both',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email_sent).toBe(true);
      expect(response.body.data.whatsapp_link).toBe('https://wa.me/60123456789?text=Invoice%20INV-001');

      // Verify InvoiceSending record
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
      expect(sendingRecord).toBeTruthy();
      expect(sendingRecord?.email_sent).toBe(true);
      expect(sendingRecord?.whatsapp_link_generated).toBe(true);
    });

    it('should succeed with partial success when email fails', async () => {
      // Mock email failure but WhatsApp success
      (EmailService.prototype.sendInvoice as jest.Mock).mockRejectedValue(
        new Error('Email service unavailable')
      );
      (WhatsAppService.generateInvoiceLink as jest.Mock).mockReturnValue(
        'https://wa.me/60123456789?text=Invoice%20INV-001'
      );

      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'both',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email_sent).toBe(false);
      expect(response.body.data.whatsapp_link).toBe('https://wa.me/60123456789?text=Invoice%20INV-001');

      // Verify InvoiceSending record shows partial success
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
      expect(sendingRecord).toBeTruthy();
      expect(sendingRecord?.email_sent).toBe(false);
      expect(sendingRecord?.email_status).toBe('failed');
      expect(sendingRecord?.email_error_message).toBe('Email service unavailable');
      expect(sendingRecord?.whatsapp_link_generated).toBe(true);
    });

    it('should succeed with partial success when WhatsApp fails', async () => {
      // Mock email success but WhatsApp failure
      (EmailService.prototype.sendInvoice as jest.Mock).mockResolvedValue(undefined);
      (WhatsAppService.generateInvoiceLink as jest.Mock).mockImplementation(() => {
        throw new Error('WhatsApp service error');
      });

      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'both',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email_sent).toBe(true);
      expect(response.body.data.whatsapp_link).toBeUndefined();

      // Verify InvoiceSending record shows partial success
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
      expect(sendingRecord).toBeTruthy();
      expect(sendingRecord?.email_sent).toBe(true);
      expect(sendingRecord?.email_status).toBe('sent');
      expect(sendingRecord?.whatsapp_link_generated).toBe(false);
      expect(sendingRecord?.whatsapp_error_message).toBe('WhatsApp service error');
    });

    it('should succeed even when both email and WhatsApp fail', async () => {
      // Mock both failures
      (EmailService.prototype.sendInvoice as jest.Mock).mockRejectedValue(
        new Error('Email failed')
      );
      (WhatsAppService.generateInvoiceLink as jest.Mock).mockImplementation(() => {
        throw new Error('WhatsApp failed');
      });

      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'both',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email_sent).toBe(false);
      expect(response.body.data.whatsapp_link).toBeUndefined();

      // Verify InvoiceSending record shows both failures
      const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
      expect(sendingRecord).toBeTruthy();
      expect(sendingRecord?.email_sent).toBe(false);
      expect(sendingRecord?.email_status).toBe('failed');
      expect(sendingRecord?.email_error_message).toBe('Email failed');
      expect(sendingRecord?.whatsapp_link_generated).toBe(false);
      expect(sendingRecord?.whatsapp_error_message).toBe('WhatsApp failed');
    });
  });

  describe('Validation', () => {
    it('should reject invalid send_method', async () => {
      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid send_method');
    });

    it('should reject when invoice not found', async () => {
      const response = await request(app)
        .post('/api/v1/invoices/507f1f77bcf86cd799439011/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          send_method: 'email',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Invoice not found');
    });
  });
});
