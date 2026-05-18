import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  type: number; // 1 = individual, 2 = company
  company_name: string;
  company_registration_no: string;
  tin_number: string;
  sst_registration_no?: string;
  business_activity_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  state_code: string;
  country_code: string;
  email: string;
  phone: string;
  myinvois_client_id?: string;
  myinvois_client_secret?: string;
  myinvois_access_token?: string;
  myinvois_token_expiry?: Date;
  auto_consolidate_enabled?: boolean;
  auto_consolidate_day?: number; // day of month to trigger (1-7), default 5
  auto_consolidate_batch_size?: number; // chunk size when submitting, default 20
  auto_consolidate_last_run_at?: Date;
  auto_consolidate_last_status?: string;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    type: { type: Number, required: true, enum: [1, 2] }, // 1 = individual, 2 = company
    company_name: { type: String, required: true, maxlength: 200 },
    company_registration_no: { type: String, required: true, maxlength: 50 },
    tin_number: { type: String, required: true, maxlength: 20 },
    sst_registration_no: { type: String, maxlength: 50 },
    business_activity_code: { type: String, required: true, maxlength: 10 },
    address_line1: { type: String, required: true, maxlength: 200 },
    address_line2: { type: String, maxlength: 200 },
    city: { type: String, required: true, maxlength: 100 },
    postcode: { type: String, required: true, maxlength: 10 },
    state_code: { type: String, required: true, maxlength: 2 },
    country_code: { type: String, required: true, default: 'MY', maxlength: 2 },
    email: { type: String, required: true, maxlength: 100 },
    phone: { type: String, required: true, maxlength: 20 },
    myinvois_client_id: { type: String, maxlength: 255 },
    myinvois_client_secret: { type: String, maxlength: 255 },
    myinvois_access_token: { type: String },
    myinvois_token_expiry: { type: Date },
    auto_consolidate_enabled: { type: Boolean, default: false },
    auto_consolidate_day: { type: Number, default: 5, min: 1, max: 7 },
    auto_consolidate_batch_size: { type: Number, default: 20, min: 1, max: 100 },
    auto_consolidate_last_run_at: { type: Date },
    auto_consolidate_last_status: { type: String, maxlength: 500 },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
