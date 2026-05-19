import mongoose, { Schema, Document } from 'mongoose';

export interface IPosDevice extends Document {
  device_id: string;
  tenant_id: mongoose.Types.ObjectId;
  device_name: string;
  device_type: 'tablet' | 'desktop';
  pairing_code?: string;
  pairing_code_expires_at?: Date;
  status: 'pending' | 'active' | 'inactive';
  last_sync_at?: Date;
  device_token?: string;
  created_at: Date;
  activated_at?: Date;
}

const PosDeviceSchema = new Schema<IPosDevice>(
  {
    device_id: { type: String, required: true, unique: true, maxlength: 100 },
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    device_name: { type: String, required: true, maxlength: 100 },
    device_type: { type: String, required: true, enum: ['tablet', 'desktop'] },
    pairing_code: { type: String, maxlength: 10 },
    pairing_code_expires_at: { type: Date },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'active', 'inactive'],
    },
    last_sync_at: { type: Date },
    device_token: { type: String, maxlength: 500 },
    activated_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PosDeviceSchema.index({ tenant_id: 1, status: 1 });
PosDeviceSchema.index({ pairing_code: 1 });

export const PosDevice = mongoose.model<IPosDevice>('PosDevice', PosDeviceSchema);
