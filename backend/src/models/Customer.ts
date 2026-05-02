import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  registration_no: string;
  id_type: 'NRIC' | 'PASSPORT' | 'BRN' | 'ARMY';
  tin_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postcode?: string;
  state_code?: string;
  country_code: string;
  customer_type: 'B2B' | 'B2C';
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, maxlength: 200 },
    email: { type: String, maxlength: 100 },
    phone: { type: String, maxlength: 20 },
    registration_no: { type: String, required: true, maxlength: 50 },
    id_type: {
      type: String,
      required: true,
      enum: ['NRIC', 'PASSPORT', 'BRN', 'ARMY'],
      maxlength: 20,
    },
    tin_number: { type: String, maxlength: 20 },
    address_line1: { type: String, maxlength: 200 },
    address_line2: { type: String, maxlength: 200 },
    city: { type: String, maxlength: 100 },
    postcode: { type: String, maxlength: 10 },
    state_code: { type: String, maxlength: 2 },
    country_code: { type: String, required: true, default: 'MY', maxlength: 2 },
    customer_type: {
      type: String,
      required: true,
      enum: ['B2B', 'B2C'],
      maxlength: 3,
    },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

CustomerSchema.index({ tenant_id: 1, deleted_at: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
