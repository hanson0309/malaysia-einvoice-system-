import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  tax_exemption_reason?: string;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String },
    sku: { type: String, maxlength: 100 },
    unit_price: { type: Number, required: true },
    tax_type: {
      type: String,
      required: true,
      enum: ['SST', 'E', 'Z', 'SR'],
      maxlength: 3,
    },
    tax_rate: { type: Number, required: true },
    tax_exemption_reason: { type: String, maxlength: 200 },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ProductSchema.index({ tenant_id: 1, deleted_at: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
