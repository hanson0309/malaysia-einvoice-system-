import mongoose, { Schema, Document } from 'mongoose';

export interface IPosServiceItem {
  description: string;
  price: number;
}

export interface IPosAppointment extends Document {
  tenant_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  appointment_date: Date;
  start_time: string;
  end_time: string;
  service_type: string;
  service_items: IPosServiceItem[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  reminder_sent: boolean;
  created_at: Date;
}

const PosServiceItemSchema = new Schema<IPosServiceItem>({
  description: { type: String, required: true, maxlength: 200 },
  price: { type: Number, required: true },
});

const PosAppointmentSchema = new Schema<IPosAppointment>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    appointment_date: { type: Date, required: true },
    start_time: { type: String, required: true, maxlength: 10 },
    end_time: { type: String, required: true, maxlength: 10 },
    service_type: { type: String, required: true, maxlength: 100 },
    service_items: { type: [PosServiceItemSchema], required: true },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    },
    notes: { type: String, maxlength: 500 },
    reminder_sent: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PosAppointmentSchema.index({ tenant_id: 1, appointment_date: 1 });
PosAppointmentSchema.index({ customer_id: 1 });

export const PosAppointment = mongoose.model<IPosAppointment>(
  'PosAppointment',
  PosAppointmentSchema
);
