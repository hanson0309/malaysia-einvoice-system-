import mongoose, { Schema, Document } from 'mongoose';

export interface IReceiptClaim extends Document {
  tenant_id: mongoose.Types.ObjectId;
  invoice_id: mongoose.Types.ObjectId;
  receipt_number: string;
  claimant_type: 'individual' | 'business';
  name: string;
  email: string;
  phone: string;
  ic?: string;
  tin?: string;
  brn?: string;
  sst?: string;
  address_line1: string;
  address_line2?: string;
  postcode: string;
  city: string;
  state_code: string;
  country_code: string;
  status: 'pending' | 'processing' | 'submitted' | 'failed';
  created_at: Date;
  updated_at: Date;
}

const ReceiptClaimSchema = new Schema<IReceiptClaim>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    receipt_number: { type: String, required: true, maxlength: 50 },
    claimant_type: {
      type: String,
      required: true,
      enum: ['individual', 'business'],
    },
    name: { type: String, required: true, maxlength: 200 },
    email: { type: String, required: true, maxlength: 100 },
    phone: { type: String, required: true, maxlength: 20 },
    ic: { type: String, maxlength: 20 },
    tin: { type: String, maxlength: 20 },
    brn: { type: String, maxlength: 50 },
    sst: { type: String, maxlength: 50 },
    address_line1: { type: String, required: true, maxlength: 200 },
    address_line2: { type: String, maxlength: 200 },
    postcode: { type: String, required: true, maxlength: 10 },
    city: { type: String, required: true, maxlength: 100 },
    state_code: { type: String, required: true, maxlength: 2 },
    country_code: { type: String, required: true, default: 'MY', maxlength: 2 },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'submitted', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ReceiptClaimSchema.index({ tenant_id: 1, receipt_number: 1 });

export const ReceiptClaim = mongoose.model<IReceiptClaim>(
  'ReceiptClaim',
  ReceiptClaimSchema
);
