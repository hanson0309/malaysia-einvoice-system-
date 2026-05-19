import request from 'supertest';
import { app } from '../../app';
import { Invoice, Customer } from '../../models';
import mongoose from 'mongoose';

describe('POST /api/v1/invoices - POS source', () => {
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

  it('should create invoice with POS source', async () => {
    const response = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        invoice_number: 'INV-POS-001',
        invoice_type: '02',
        customer_id: customerId,
        issue_date: '2026-05-20',
        currency: 'MYR',
        payment_method: 'cash',
        items: [
          {
            description: 'Test Product',
            quantity: 1,
            unit_price: 100,
            tax_type: 'SST',
            tax_rate: 6,
          },
        ],
        source: 'pos',
        pos_transaction_id: 'txn-uuid-123',
      })
      .expect(201);

    expect(response.body.source).toBe('pos');
    expect(response.body.pos_transaction_id).toBe('txn-uuid-123');
  });

  it('should default to manual source if not specified', async () => {
    const response = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        invoice_number: 'INV-MANUAL-001',
        invoice_type: '02',
        customer_id: customerId,
        issue_date: '2026-05-20',
        currency: 'MYR',
        items: [
          {
            description: 'Test Product',
            quantity: 1,
            unit_price: 100,
            tax_type: 'SST',
            tax_rate: 6,
          },
        ],
      })
      .expect(201);

    expect(response.body.source).toBe('manual');
  });
});

describe('GET /api/v1/invoices - filter by source', () => {
  let validToken: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
  });

  it('should filter invoices by POS source', async () => {
    const response = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ source: 'pos' })
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should filter invoices by manual source', async () => {
    const response = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ source: 'manual' })
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
