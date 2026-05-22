import mongoose, { Schema, Document } from 'mongoose';

export interface IPosInventoryLog extends Document {
  tenant_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'stocktake';
  quantity_change: number;
  before_quantity: number;
  after_quantity: number;
  reference_id?: string;
  notes?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
}

const PosInventoryLogSchema = new Schema<IPosInventoryLog>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    transaction_type: {
      type: String,
      required: true,
      enum: ['purchase', 'sale', 'adjustment', 'stocktake'],
    },
    quantity_change: { type: Number, required: true },
    before_quantity: { type: Number, required: true },
    after_quantity: { type: Number, required: true },
    reference_id: { type: String, maxlength: 100 },
    notes: { type: String, maxlength: 500 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PosInventoryLogSchema.index({ tenant_id: 1, product_id: 1, created_at: -1 });

export const PosInventoryLog = mongoose.model<IPosInventoryLog>(
  'PosInventoryLog',
  PosInventoryLogSchema
);
