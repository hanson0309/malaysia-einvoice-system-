import request from 'supertest';
import { app } from '../../app';
import { Product } from '../../models';
import mongoose from 'mongoose';

describe('GET /api/v1/pos/products', () => {
  let validToken: string;
  let testTenantId: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();
  });

  it('should list all products', async () => {
    const response = await request(app)
      .get('/api/v1/pos/products')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should search products by barcode', async () => {
    await Product.create({
      tenant_id: testTenantId,
      name: 'Test Product',
      unit_price: 100,
      tax_type: 'SST',
      tax_rate: 6,
      barcode: '1234567890',
    });

    const response = await request(app)
      .get('/api/v1/pos/products')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ barcode: '1234567890' })
      .expect(200);

    expect(response.body.name).toBe('Test Product');
    expect(response.body.barcode).toBe('1234567890');
  });
});

describe('POST /api/v1/pos/products', () => {
  let validToken: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
  });

  it('should create a new product', async () => {
    const response = await request(app)
      .post('/api/v1/pos/products')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'New Product',
        description: 'Test description',
        sku: 'SKU-001',
        unit_price: 150,
        tax_type: 'SST',
        tax_rate: 6,
        barcode: '9876543210',
        stock_quantity: 50,
        reorder_level: 10,
        cost_price: 100,
      })
      .expect(201);

    expect(response.body.name).toBe('New Product');
    expect(response.body.barcode).toBe('9876543210');
  });
});

describe('PUT /api/v1/pos/products/:id', () => {
  let validToken: string;
  let testTenantId: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();
  });

  it('should update a product', async () => {
    const product = await Product.create({
      tenant_id: testTenantId,
      name: 'Old Name',
      unit_price: 100,
      tax_type: 'SST',
      tax_rate: 6,
    });

    const response = await request(app)
      .put(`/api/v1/pos/products/${product._id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Updated Name',
        unit_price: 120,
      })
      .expect(200);

    expect(response.body.name).toBe('Updated Name');
    expect(response.body.unit_price).toBe(120);
  });
});
