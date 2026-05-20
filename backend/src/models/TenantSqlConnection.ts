import mongoose, { Schema, Document } from 'mongoose';

export interface ISqlColumnMapping {
  invoice: {
    invoice_number: string;
    issue_date: string;
    invoice_type?: string;
    due_date?: string;
    currency?: string;
    subtotal?: string;
    tax_amount?: string;
    total_amount?: string;
    payment_method?: string;
    id_column?: string;
  };
  customer: {
    name: string;
    registration_no: string;
    id_type?: string;
    email?: string;
    phone?: string;
    tin_number?: string;
    address_line1?: string;
    city?: string;
    postcode?: string;
    state_code?: string;
    country_code?: string;
    customer_type?: string;
  };
  lines: {
    description: string;
    quantity: string;
    unit_price: string;
    tax_type?: string;
    tax_rate?: string;
    tax_amount?: string;
    line_total?: string;
  };
}

export interface ITenantSqlConnection extends Document {
  tenant_id: mongoose.Types.ObjectId;
  host: string;
  port: number;
  database: string;
  username: string;
  password_encrypted: string;
  invoice_query: string;
  invoice_lines_query?: string;
  column_mapping: ISqlColumnMapping;
  auto_sync_enabled: boolean;
  auto_sync_interval_minutes: number;
  last_sync_at?: Date;
  last_sync_status?: string;
  last_sync_count?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const ColumnMappingSchema = new Schema(
  {
    invoice: {
      invoice_number: { type: String, required: true },
      issue_date: { type: String, required: true },
      invoice_type: { type: String },
      due_date: { type: String },
      currency: { type: String },
      subtotal: { type: String },
      tax_amount: { type: String },
      total_amount: { type: String },
      payment_method: { type: String },
      id_column: { type: String },
    },
    customer: {
      name: { type: String, required: true },
      registration_no: { type: String, required: true },
      id_type: { type: String },
      email: { type: String },
      phone: { type: String },
      tin_number: { type: String },
      address_line1: { type: String },
      city: { type: String },
      postcode: { type: String },
      state_code: { type: String },
      country_code: { type: String },
      customer_type: { type: String },
    },
    lines: {
      description: { type: String, required: true },
      quantity: { type: String, required: true },
      unit_price: { type: String, required: true },
      tax_type: { type: String },
      tax_rate: { type: String },
      tax_amount: { type: String },
      line_total: { type: String },
    },
  },
  { _id: false }
);

const TenantSqlConnectionSchema = new Schema<ITenantSqlConnection>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    host: { type: String, required: true, maxlength: 255 },
    port: { type: Number, required: true, default: 3306 },
    database: { type: String, required: true, maxlength: 255 },
    username: { type: String, required: true, maxlength: 255 },
    password_encrypted: { type: String, required: true },
    invoice_query: { type: String, required: true },
    invoice_lines_query: { type: String },
    column_mapping: { type: ColumnMappingSchema, required: true },
    auto_sync_enabled: { type: Boolean, default: false },
    auto_sync_interval_minutes: { type: Number, default: 60, min: 5, max: 1440 },
    last_sync_at: { type: Date },
    last_sync_status: { type: String, maxlength: 500 },
    last_sync_count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const TenantSqlConnection = mongoose.model<ITenantSqlConnection>(
  'TenantSqlConnection',
  TenantSqlConnectionSchema
);
