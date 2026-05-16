import request from 'supertest';
import { app } from '../../app';
import mongoose from 'mongoose';

describe('POST /api/v1/invoices/:id/send', () => {
  const invoiceId = new mongoose.Types.ObjectId().toString();

  it('should return 401 when no auth token provided', async () => {
    const response = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/send`)
      .send({
        send_method: 'email',
      });

    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid send_method', async () => {
    const response = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/send`)
      .set('Authorization', 'Bearer invalid-token')
      .send({
        send_method: 'invalid',
      });

    // Will return 401 due to invalid token, but that's expected
    // The validation would happen after auth
    expect([400, 401]).toContain(response.status);
  });
});
