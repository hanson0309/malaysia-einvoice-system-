-- backend/migrations/005_create_invoices.sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_number VARCHAR(50) NOT NULL,
  internal_reference_no VARCHAR(50),
  invoice_type VARCHAR(2) NOT NULL CHECK (invoice_type IN ('01', '02', '03', '04')),
  original_invoice_id UUID REFERENCES invoices(id),
  original_invoice_number VARCHAR(50),
  customer_id UUID NOT NULL REFERENCES customers(id),
  issue_date DATE NOT NULL,
  due_date DATE,
  currency VARCHAR(3) NOT NULL DEFAULT 'MYR',
  exchange_rate DECIMAL(15,6) NOT NULL DEFAULT 1.0,
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'ewallet')),
  payment_terms TEXT,
  paid_amount DECIMAL(15,2),
  payment_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'validated', 'submitted', 'accepted', 'rejected', 'cancelled')),
  lhdn_submission_uid VARCHAR(100),
  lhdn_validation_code VARCHAR(100),
  lhdn_qr_code TEXT,
  lhdn_digital_signature TEXT,
  lhdn_submitted_at TIMESTAMP,
  lhdn_error_message TEXT,
  lhdn_error_code VARCHAR(50),
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP,
  pdf_url VARCHAR(500),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_lhdn_uid ON invoices(lhdn_submission_uid);
CREATE INDEX idx_invoices_retry ON invoices(next_retry_at) WHERE next_retry_at IS NOT NULL;
