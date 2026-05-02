import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
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
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
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
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
