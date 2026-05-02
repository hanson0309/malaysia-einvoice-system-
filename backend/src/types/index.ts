// backend/src/types/index.ts
import { Request } from 'express';

export interface JWTPayload {
  user_id: string;
  tenant_id: string;
  email: string;
  role: 'admin' | 'accountant' | 'viewer';
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
  tenantId?: string;
}

export interface Tenant {
  id: string;
  company_name: string;
  company_registration_no: string;
  tin_number: string;
  sst_registration_no?: string;
  business_activity_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  state_code: string;
  country_code: string;
  email: string;
  phone: string;
  myinvois_client_id?: string;
  myinvois_client_secret?: string;
  myinvois_access_token?: string;
  myinvois_token_expiry?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'accountant' | 'viewer';
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  registration_no: string;
  id_type: 'NRIC' | 'PASSPORT' | 'BRN' | 'ARMY';
  tin_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postcode?: string;
  state_code?: string;
  country_code: string;
  customer_type: 'B2B' | 'B2C';
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  tax_exemption_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  internal_reference_no?: string;
  invoice_type: '01' | '02' | '03' | '04';
  original_invoice_id?: string;
  original_invoice_number?: string;
  customer_id: string;
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
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  tax_amount: number;
  tax_exemption_reason?: string;
  line_total: number;
}
