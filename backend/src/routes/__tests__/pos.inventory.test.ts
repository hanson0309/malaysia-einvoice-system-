import request from 'supertest';
import { app } from '../../app';
import { Product, PosInventoryLog } from '../../models';
import mongoose from 'mongoose';

describe('POST /api/v1/pos/inventory/adjust', () => {
  let validToken: string;
  let testTenantId: string;
  let productId: string;

  beforeAll(async () => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();

    const product = await Product.create({
      tenant_id: testTenantId,
      name: 'Test Product',
      unit_price: 100,
      tax_type: 'SST',
      tax_rate: 6,
      stock_quantity: 50,
    });
    productId = product._id.toString();
  });

  it('should adjust inventory', async () => {
    const response = await request(app)
      .post('/api/v1/pos/inventory/adjust')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        product_id: productId,
        quantity_change: -5,
        transaction_type: 'adjustment',
        notes: 'Damaged items',
      })
      .expect(200);

    expect(response.body.message).toBe('Inventory adjusted');
    expect(response.body.new_quantity).toBe(45);
  });
});

describe('POST /api/v1/pos/inventory/restock', () => {
  let validToken: string;
  let testTenantId: string;
  let productId: string;

  beforeAll(async () => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();

    const product = await Product.create({
      tenant_id: testTenantId,
      name: 'Test Product 2',
      unit_price: 100,
      tax_type: 'SST',
      tax_rate: 6,
      stock_quantity: 10,
    });
    productId = product._id.toString();
  });

  it('should restock inventory', async () => {
    const response = await request(app)
      .post('/api/v1/pos/inventory/restock')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        product_id: productId,
        quantity: 50,
        reference_id: 'PO-001',
        notes: 'New stock arrival',
      })
      .expect(200);

    expect(response.body.message).toBe('Inventory restocked');
    expect(response.body.new_quantity).toBe(60);
  });
});

describe('GET /api/v1/pos/inventory/logs', () => {
  let validToken: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
  });

  it('should list inventory logs', async () => {
    const response = await request(app)
      .get('/api/v1/pos/inventory/logs')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should filter logs by product', async () => {
    const productId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .get('/api/v1/pos/inventory/logs')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ product_id: productId })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
