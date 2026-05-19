import mongoose from 'mongoose';
import { TenantPosSettings } from '../TenantPosSettings';

describe('TenantPosSettings Model', () => {
  it('should create settings with default values', async () => {
    const settingsData = {
      tenant_id: new mongoose.Types.ObjectId(),
      modules: {
        appointment: false,
        inventory: true,
        multi_cashier: true,
        customer_management: true,
      },
      business_type: 'retail' as const,
      invoice_settings: {
        auto_create_on_payment: true,
        default_invoice_type: '02' as const,
        require_customer_for_invoice: false,
      },
      hardware: {
        receipt_printer_enabled: true,
        barcode_scanner_enabled: true,
        cash_drawer_enabled: false,
        label_printer_enabled: false,
      },
    };

    const settings = await TenantPosSettings.create(settingsData);
    expect(settings.business_type).toBe('retail');
    expect(settings.modules.inventory).toBe(true);
  });
});
