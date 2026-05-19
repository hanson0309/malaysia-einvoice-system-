import request from 'supertest';
import { app } from '../../app';
import { TenantPosSettings } from '../../models';
import mongoose from 'mongoose';

describe('GET /api/v1/pos/settings', () => {
  let validToken: string;
  let testTenantId: string;

  beforeAll(() => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();
  });

  it('should get POS settings', async () => {
    const response = await request(app)
      .get('/api/v1/pos/settings')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.tenant_id).toBeDefined();
    expect(response.body.modules).toBeDefined();
    expect(response.body.business_type).toBeDefined();
  });

  it('should create default settings if none exist', async () => {
    // Delete existing settings
    await TenantPosSettings.deleteMany({ tenant_id: testTenantId });

    const response = await request(app)
      .get('/api/v1/pos/settings')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.business_type).toBe('retail');
    expect(response.body.modules.inventory).toBe(true);
  });
});

describe('PUT /api/v1/pos/settings', () => {
  let validToken: string;
  let testTenantId: string;

  beforeAll(async () => {
    validToken = process.env.TEST_TOKEN || 'test-token';
    testTenantId = process.env.TEST_TENANT_ID || new mongoose.Types.ObjectId().toString();

    // Ensure settings exist
    await TenantPosSettings.findOneAndUpdate(
      { tenant_id: testTenantId },
      { tenant_id: testTenantId },
      { upsert: true, new: true }
    );
  });

  it('should update POS settings', async () => {
    const response = await request(app)
      .put('/api/v1/pos/settings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        business_type: 'both',
        modules: {
          appointment: true,
          inventory: true,
          multi_cashier: true,
          customer_management: true,
        },
        invoice_settings: {
          auto_create_on_payment: false,
          default_invoice_type: '01',
          require_customer_for_invoice: true,
        },
      })
      .expect(200);

    expect(response.body.business_type).toBe('both');
    expect(response.body.modules.appointment).toBe(true);
    expect(response.body.invoice_settings.auto_create_on_payment).toBe(false);
  });

  it('should update partial settings', async () => {
    const response = await request(app)
      .put('/api/v1/pos/settings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        hardware: {
          receipt_printer_enabled: true,
          barcode_scanner_enabled: true,
          cash_drawer_enabled: true,
          label_printer_enabled: true,
        },
      })
      .expect(200);

    expect(response.body.hardware.cash_drawer_enabled).toBe(true);
    expect(response.body.hardware.label_printer_enabled).toBe(true);
  });
});
