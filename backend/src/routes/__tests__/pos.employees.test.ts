import request from 'supertest';
import { app } from '../../app';
import { User } from '../../models';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

describe('POST /api/v1/pos/employees/pin-login', () => {
  let testTenantId: string;

  beforeAll(async () => {
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();

    // Create test employee with PIN
    const pinHash = await bcrypt.hash('1234', 10);
    await User.create({
      tenant_id: testTenantId,
      email: 'cashier@test.com',
      password_hash: 'dummy-hash',
      role: 'cashier',
      employee_code: 'EMP001',
      pin_code: pinHash,
      active_status: 'active',
    });
  });

  it('should login with valid PIN', async () => {
    const response = await request(app)
      .post('/api/v1/pos/employees/pin-login')
      .send({
        employee_code: 'EMP001',
        pin: '1234',
      })
      .expect(200);

    expect(response.body.token).toBeDefined();
    expect(response.body.employee.employee_code).toBe('EMP001');
    expect(response.body.employee.role).toBe('cashier');
  });

  it('should reject invalid PIN', async () => {
    const response = await request(app)
      .post('/api/v1/pos/employees/pin-login')
      .send({
        employee_code: 'EMP001',
        pin: '9999',
      })
      .expect(401);

    expect(response.body.error).toBeDefined();
  });

  it('should reject inactive employee', async () => {
    const pinHash = await bcrypt.hash('5678', 10);
    await User.create({
      tenant_id: testTenantId,
      email: 'inactive@test.com',
      password_hash: 'dummy-hash',
      role: 'cashier',
      employee_code: 'EMP002',
      pin_code: pinHash,
      active_status: 'inactive',
    });

    const response = await request(app)
      .post('/api/v1/pos/employees/pin-login')
      .send({
        employee_code: 'EMP002',
        pin: '5678',
      })
      .expect(401);

    expect(response.body.error).toBeDefined();
  });
});

describe('GET /api/v1/pos/employees', () => {
  let validToken: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
  });

  it('should list all employees', async () => {
    const response = await request(app)
      .get('/api/v1/pos/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should filter employees by role', async () => {
    const response = await request(app)
      .get('/api/v1/pos/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ role: 'cashier' })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
