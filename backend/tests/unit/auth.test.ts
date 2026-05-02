import jwt from 'jsonwebtoken';
import { config } from '../../src/config/env';

describe('JWT Authentication', () => {
  it('should generate valid JWT token', () => {
    const payload = {
      user_id: '123',
      tenant_id: '456',
      email: 'test@example.com',
      role: 'admin',
    };

    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;

    expect(decoded.user_id).toBe('123');
    expect(decoded.tenant_id).toBe('456');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('admin');
  });

  it('should reject invalid token', () => {
    expect(() => {
      jwt.verify('invalid-token', config.JWT_SECRET);
    }).toThrow();
  });

  it('should reject expired token', (done) => {
    const payload = { user_id: '123' };
    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1ms' });

    setTimeout(() => {
      expect(() => {
        jwt.verify(token, config.JWT_SECRET);
      }).toThrow();
      done();
    }, 100);
  });
});
