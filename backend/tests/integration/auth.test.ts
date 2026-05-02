// backend/tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/config/database';

describe('POST /api/v1/auth/register', () => {
  afterAll(async () => {
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM tenants');
    await pool.end();
  });

  it('should register new tenant and admin user', async () => {
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
        country_code: 'MY',
        email: 'admin@test.com',
        phone: '+60123456789',
        password: 'SecurePass123!',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
    expect(response.body.user).toHaveProperty('email', 'admin@test.com');
    expect(response.body.user).toHaveProperty('role', 'admin');
  });

  it('should reject duplicate email', async () => {
    const userData = {
      company_name: 'Test Company 2',
      company_registration_no: 'REG456',
      tin_number: '123456789013',
      business_activity_code: '12345',
      address_line1: '456 Test St',
      city: 'Kuala Lumpur',
      postcode: '50000',
      state_code: '14',
      country_code: 'MY',
      email: 'admin@test.com',
      phone: '+60123456790',
      password: 'SecurePass123!',
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('DUPLICATE');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'SecurePass123!',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'WrongPassword',
      });

    expect(response.status).toBe(401);
  });
});
