import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  tenant_id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  role: 'admin' | 'accountant' | 'viewer' | 'cashier' | 'inventory_manager' | 'service_staff';
  // POS employee fields
  employee_code?: string;
  pin_code?: string;
  active_status?: 'active' | 'inactive';
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    email: { type: String, required: true, unique: true, maxlength: 100 },
    password_hash: { type: String, required: true, maxlength: 255 },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'accountant', 'viewer', 'cashier', 'inventory_manager', 'service_staff'],
      maxlength: 20,
    },
    // POS employee fields
    employee_code: { type: String, maxlength: 50 },
    pin_code: { type: String, maxlength: 255 },
    active_status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

UserSchema.index({ tenant_id: 1, deleted_at: 1 });
UserSchema.index({ employee_code: 1 }); // Add index for employee code lookup

export const User = mongoose.model<IUser>('User', UserSchema);
