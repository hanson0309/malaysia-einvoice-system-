import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceSending extends Document {
  tenant_id: mongoose.Types.ObjectId;
  invoice_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  send_method: 'email' | 'whatsapp' | 'both';
  email_sent: boolean;
  email_sent_at?: Date;
  email_status: 'pending' | 'sent' | 'failed';
  email_error_message?: string;
  email_to: string;
  whatsapp_link_generated: boolean;
  whatsapp_link?: string;
  whatsapp_phone: string;
  sent_by: mongoose.Types.ObjectId;
  pdf_url?: string;
  created_at: Date;
  updated_at: Date;
}

const InvoiceSendingSchema = new Schema<IInvoiceSending>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    send_method: { type: String, required: true, enum: ['email', 'whatsapp', 'both'] },
    email_sent: { type: Boolean, required: true, default: false },
    email_sent_at: { type: Date },
    email_status: { type: String, required: true, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    email_error_message: { type: String },
    email_to: { type: String, required: true },
    whatsapp_link_generated: { type: Boolean, required: true, default: false },
    whatsapp_link: { type: String },
    whatsapp_phone: { type: String, default: '' },
    sent_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pdf_url: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

InvoiceSendingSchema.index({ tenant_id: 1, invoice_id: 1 });
InvoiceSendingSchema.index({ tenant_id: 1, customer_id: 1 });
InvoiceSendingSchema.index({ tenant_id: 1, created_at: -1 });

export const InvoiceSending = mongoose.model<IInvoiceSending>('InvoiceSending', InvoiceSendingSchema);
