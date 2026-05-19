import mongoose from 'mongoose';
import { PosDevice } from '../PosDevice';

describe('PosDevice Model', () => {
  it('should create a device with valid data', async () => {
    const deviceData = {
      device_id: 'test-device-uuid',
      tenant_id: new mongoose.Types.ObjectId(),
      device_name: 'Cashier 1',
      device_type: 'tablet' as const,
      pairing_code: 'ABC123',
      pairing_code_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      status: 'pending' as const,
      device_token: 'test-jwt-token',
    };

    const device = await PosDevice.create(deviceData);
    expect(device.device_name).toBe('Cashier 1');
    expect(device.status).toBe('pending');
  });

  it('should require tenant_id', async () => {
    const deviceData = {
      device_id: 'test-device-uuid',
      device_name: 'Cashier 1',
      device_type: 'tablet' as const,
    };

    await expect(PosDevice.create(deviceData)).rejects.toThrow();
  });
});
