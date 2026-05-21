import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  product_id?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  tax_amount: number;
  tax_exemption_reason?: string;
  classificationCode?: string;
  line_total: number;
}

export interface IInvoice extends Document {
  tenant_id: mongoose.Types.ObjectId;
  invoice_number: string;
  internal_reference_no?: string;
  invoice_type: '01' | '02' | '03' | '04';
  original_invoice_id?: mongoose.Types.ObjectId;
  original_invoice_number?: string;
  customer_id?: mongoose.Types.ObjectId;
  issue_date: Date;
  due_date?: Date;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method?: 'cash' | 'bank_transfer' | 'card' | 'ewallet';
  payment_terms?: string;
  paid_amount?: number;
  payment_date?: Date;
  status: 'draft' | 'validated' | 'submitted' | 'accepted' | 'rejected' | 'cancelled';
  lhdn_submission_uid?: string;
  lhdn_validation_code?: string;
  lhdn_qr_code?: string;
  lhdn_digital_signature?: string;
  lhdn_submitted_at?: Date;
  lhdn_error_message?: string;
  lhdn_error_code?: string;
  retry_count: number;
  next_retry_at?: Date;
  pdf_url?: string;
  items: IInvoiceItem[];
  // POS source tracking
  source?: 'manual' | 'pos' | 'sql';
  pos_transaction_id?: string;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true, maxlength: 500 },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  tax_type: {
    type: String,
    required: true,
    enum: ['SST', 'E', 'Z', 'SR'],
  },
  tax_rate: { type: Number, required: true },
  tax_amount: { type: Number, required: true },
  tax_exemption_reason: { type: String, maxlength: 200 },
  classificationCode: { type: String, maxlength: 50 },
  line_total: { type: Number, required: true },
});

const InvoiceSchema = new Schema<IInvoice>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    invoice_number: { type: String, required: true, maxlength: 50 },
    internal_reference_no: { type: String, maxlength: 50 },
    invoice_type: {
      type: String,
      required: true,
      enum: ['01', '02', '03', '04'],
    },
    original_invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    original_invoice_number: { type: String, maxlength: 50 },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
    issue_date: { type: Date, required: true },
    due_date: { type: Date },
    currency: { type: String, required: true, default: 'MYR', maxlength: 3 },
    exchange_rate: { type: Number, required: true, default: 1.0 },
    subtotal: { type: Number, required: true },
    tax_amount: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    payment_method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'ewallet'],
    },
    payment_terms: { type: String },
    paid_amount: { type: Number },
    payment_date: { type: Date },
    status: {
      type: String,
      required: true,
      default: 'draft',
      enum: ['draft', 'validated', 'submitted', 'accepted', 'rejected', 'cancelled'],
    },
    lhdn_submission_uid: { type: String, maxlength: 100 },
    lhdn_validation_code: { type: String, maxlength: 100 },
    lhdn_qr_code: { type: String },
    lhdn_digital_signature: { type: String },
    lhdn_submitted_at: { type: Date },
    lhdn_error_message: { type: String },
    lhdn_error_code: { type: String, maxlength: 50 },
    retry_count: { type: Number, required: true, default: 0 },
    next_retry_at: { type: Date },
    pdf_url: { type: String, maxlength: 500 },
    items: [InvoiceItemSchema],
    // POS source tracking
    source: { type: String, enum: ['manual', 'pos', 'sql'], default: 'manual' },
    pos_transaction_id: { type: String, maxlength: 100 },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

InvoiceSchema.index({ tenant_id: 1, invoice_number: 1 }, { unique: true });
InvoiceSchema.index({ tenant_id: 1, status: 1 });
InvoiceSchema.index({ lhdn_submission_uid: 1 });
InvoiceSchema.index({ next_retry_at: 1 });
InvoiceSchema.index({ pos_transaction_id: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
