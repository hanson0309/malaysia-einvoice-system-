import mongoose, { Schema, Document } from 'mongoose';

export interface ITenantPosSettings extends Document {
  tenant_id: mongoose.Types.ObjectId;
  modules: {
    appointment: boolean;
    inventory: boolean;
    multi_cashier: boolean;
    customer_management: boolean;
  };
  business_type: 'retail' | 'service' | 'both';
  invoice_settings: {
    auto_create_on_payment: boolean;
    default_invoice_type: '01' | '02';
    require_customer_for_invoice: boolean;
  };
  hardware: {
    receipt_printer_enabled: boolean;
    barcode_scanner_enabled: boolean;
    cash_drawer_enabled: boolean;
    label_printer_enabled: boolean;
  };
  updated_at: Date;
}

const TenantPosSettingsSchema = new Schema<ITenantPosSettings>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    modules: {
      appointment: { type: Boolean, required: true, default: false },
      inventory: { type: Boolean, required: true, default: true },
      multi_cashier: { type: Boolean, required: true, default: true },
      customer_management: { type: Boolean, required: true, default: true },
    },
    business_type: {
      type: String,
      required: true,
      default: 'retail',
      enum: ['retail', 'service', 'both'],
    },
    invoice_settings: {
      auto_create_on_payment: { type: Boolean, required: true, default: true },
      default_invoice_type: { type: String, required: true, default: '02', enum: ['01', '02'] },
      require_customer_for_invoice: { type: Boolean, required: true, default: false },
    },
    hardware: {
      receipt_printer_enabled: { type: Boolean, required: true, default: true },
      barcode_scanner_enabled: { type: Boolean, required: true, default: true },
      cash_drawer_enabled: { type: Boolean, required: true, default: false },
      label_printer_enabled: { type: Boolean, required: true, default: false },
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
  }
);

TenantPosSettingsSchema.index({ tenant_id: 1 });

export const TenantPosSettings = mongoose.model<ITenantPosSettings>(
  'TenantPosSettings',
  TenantPosSettingsSchema
);
