import request from 'supertest';
import { app } from '../../app';
import mongoose from 'mongoose';

describe('POST /api/v1/pos/transactions', () => {
  let deviceToken: string;
  let cashierId: string;

  beforeAll(() => {
    deviceToken = process.env.TEST_DEVICE_TOKEN || 'test-device-token';
    cashierId = new mongoose.Types.ObjectId().toString();
  });

  it('should sync transactions from POS', async () => {
    const response = await request(app)
      .post('/api/v1/pos/transactions')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        transactions: [
          {
            transaction_id: 'txn-uuid-001',
            transaction_number: 'TXN-001',
            transaction_date: '2026-05-19',
            cashier_id: cashierId,
            items: [
              {
                description: 'Test Product',
                quantity: 1,
                unit_price: 100,
                tax_type: 'SST',
                tax_rate: 6,
                tax_amount: 6,
                line_total: 106,
              },
            ],
            subtotal: 100,
            tax_amount: 6,
            total_amount: 106,
            payment_method: 'cash',
            payment_status: 'paid',
            device_id: 'device-uuid',
          },
        ],
      })
      .expect(200);

    expect(response.body.synced).toBe(1);
  });
});

describe('GET /api/v1/pos/transactions', () => {
  let validToken: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
  });

  it('should list transactions', async () => {
    const response = await request(app)
      .get('/api/v1/pos/transactions')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should filter transactions by date range', async () => {
    const response = await request(app)
      .get('/api/v1/pos/transactions')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ start_date: '2026-05-01', end_date: '2026-05-31' })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
