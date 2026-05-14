import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceTemplate extends Document {
  tenant_id: string;
  name: string;
  description?: string;
  invoice_type: '01' | '02' | '03' | '04';
  payment_method?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_type: string;
    tax_rate: number;
    product_id?: string;
  }>;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

const InvoiceTemplateSchema = new Schema<IInvoiceTemplate>({
  tenant_id: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  invoice_type: {
    type: String,
    enum: ['01', '02', '03', '04'],
    default: '01'
  },
  payment_method: {
    type: String,
    trim: true
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0
    },
    tax_type: {
      type: String,
      required: true
    },
    tax_rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    product_id: {
      type: String
    }
  }],
  notes: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for better query performance
InvoiceTemplateSchema.index({ tenant_id: 1, deleted_at: 1 });
InvoiceTemplateSchema.index({ tenant_id: 1, name: 1 });

export default mongoose.model<IInvoiceTemplate>('InvoiceTemplate', InvoiceTemplateSchema);
