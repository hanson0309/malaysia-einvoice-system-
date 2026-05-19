import mongoose, { Schema, Document } from 'mongoose';

export interface IPosTransactionItem {
  product_id?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

export interface IPosTransaction extends Document {
  transaction_id: string;
  tenant_id: mongoose.Types.ObjectId;
  transaction_number: string;
  transaction_date: Date;
  cashier_id: mongoose.Types.ObjectId;
  customer_id?: mongoose.Types.ObjectId;
  items: IPosTransactionItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'ewallet';
  payment_status: 'paid' | 'partial' | 'refund';
  invoice_id?: mongoose.Types.ObjectId;
  synced_at?: Date;
  device_id: string;
  created_at: Date;
}

const PosTransactionItemSchema = new Schema<IPosTransactionItem>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true, maxlength: 500 },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  tax_type: { type: String, required: true, enum: ['SST', 'E', 'Z', 'SR'] },
  tax_rate: { type: Number, required: true },
  tax_amount: { type: Number, required: true },
  line_total: { type: Number, required: true },
});

const PosTransactionSchema = new Schema<IPosTransaction>(
  {
    transaction_id: { type: String, required: true, unique: true, maxlength: 100 },
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    transaction_number: { type: String, required: true, maxlength: 50 },
    transaction_date: { type: Date, required: true },
    cashier_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer' },
    items: { type: [PosTransactionItemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax_amount: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    payment_method: { type: String, required: true, enum: ['cash', 'card', 'ewallet'] },
    payment_status: { type: String, required: true, enum: ['paid', 'partial', 'refund'] },
    invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    synced_at: { type: Date },
    device_id: { type: String, required: true, maxlength: 100 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PosTransactionSchema.index({ tenant_id: 1, transaction_date: -1 });
PosTransactionSchema.index({ transaction_id: 1 });
PosTransactionSchema.index({ invoice_id: 1 });

export const PosTransaction = mongoose.model<IPosTransaction>(
  'PosTransaction',
  PosTransactionSchema
);
