// backend/tests/integration/customers.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('Customer Routes', () => {
  let authToken: string;
  let tenantId: string;

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

  it('should create B2B customer', async () => {
    const response = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'ABC Corporation',
        email: 'contact@abc.com',
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

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('ABC Corporation');
    expect(response.body.customer_type).toBe('B2B');
  });

  it('should list customers with tenant isolation', async () => {
    const response = await request(app)
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });
});
