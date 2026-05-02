import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  tenant_id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  role: 'admin' | 'accountant' | 'viewer';
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
      enum: ['admin', 'accountant', 'viewer'],
      maxlength: 20,
    },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

UserSchema.index({ tenant_id: 1, deleted_at: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
