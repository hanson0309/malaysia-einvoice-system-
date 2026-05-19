import request from 'supertest';
import { app } from '../../app';
import { PosDevice } from '../../models';
import mongoose from 'mongoose';

describe('POST /api/v1/pos/devices', () => {
  let validToken: string;
  let testTenantId: string;

  beforeAll(() => {
    // These would be set up in test setup
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();
  });

  it('should generate pairing code', async () => {
    const response = await request(app)
      .post('/api/v1/pos/devices')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ device_name: 'Cashier 1', device_type: 'tablet' })
      .expect(201);

    expect(response.body.pairing_code).toHaveLength(6);
    expect(response.body.device_name).toBe('Cashier 1');
  });
});

describe('POST /api/v1/pos/devices/pair', () => {
  let testTenantId: string;

  beforeAll(() => {
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();
  });

  it('should pair device with valid code', async () => {
    const device = await PosDevice.create({
      device_id: 'temp-id',
      tenant_id: testTenantId,
      device_name: 'Test Device',
      device_type: 'tablet',
      pairing_code: 'ABC123',
      pairing_code_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      status: 'pending',
    });

    const response = await request(app)
      .post('/api/v1/pos/devices/pair')
      .send({
        pairing_code: 'ABC123',
        device_info: { device_id: 'real-device-uuid', os: 'Android 13' },
      })
      .expect(200);

    expect(response.body.device_token).toBeDefined();
    expect(response.body.tenant_info).toBeDefined();
  });
});

describe('GET /api/v1/pos/devices', () => {
  let validToken: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
  });

  it('should list all devices for tenant', async () => {
    const response = await request(app)
      .get('/api/v1/pos/devices')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('DELETE /api/v1/pos/devices/:id', () => {
  let validToken: string;
  let testTenantId: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();
  });

  it('should deactivate device', async () => {
    const device = await PosDevice.create({
      device_id: 'device-to-deactivate',
      tenant_id: testTenantId,
      device_name: 'Test Device',
      device_type: 'tablet',
      status: 'active',
    });

    const response = await request(app)
      .delete(`/api/v1/pos/devices/${device._id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.message).toBe('Device deactivated');
  });
});
