import mongoose from 'mongoose';
import { User } from '../User';

describe('User Model - POS Employee Extensions', () => {
  it('should create a user with POS employee fields', async () => {
    const userData = {
      tenant_id: new mongoose.Types.ObjectId(),
      email: 'cashier@test.com',
      password_hash: 'hashed_password',
      role: 'cashier' as const,
      employee_code: 'EMP-001',
      pin_code: 'hashed_pin',
      active_status: 'active' as const,
    };

    const user = await User.create(userData);
    expect(user.employee_code).toBe('EMP-001');
    expect(user.active_status).toBe('active');
  });
});
