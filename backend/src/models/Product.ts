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
  // POS fields
  barcode?: string;
  stock_quantity?: number;
  reorder_level?: number;
  batch_number?: string;
  expiry_date?: Date;
  cost_price?: number;
  image_url?: string;
  unit?: string;
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
    unit: { type: String, maxlength: 20 },
    // POS fields
    barcode: { type: String, maxlength: 50 },
    stock_quantity: { type: Number, default: 0 },
    reorder_level: { type: Number, default: 0 },
    batch_number: { type: String, maxlength: 50 },
    expiry_date: { type: Date },
    cost_price: { type: Number },
    image_url: { type: String, maxlength: 500 },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ProductSchema.index({ tenant_id: 1, deleted_at: 1 });
ProductSchema.index({ tenant_id: 1, barcode: 1 }); // Compound index for tenant-scoped barcode lookup
ProductSchema.index({ tenant_id: 1, updated_at: -1 }); // For incremental sync
ProductSchema.index({ tenant_id: 1, name: 'text', description: 'text' }); // Full-text search

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
