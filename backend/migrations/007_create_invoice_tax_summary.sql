-- backend/migrations/007_create_invoice_tax_summary.sql
CREATE TABLE invoice_tax_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tax_type VARCHAR(3) NOT NULL CHECK (tax_type IN ('SST', 'E', 'Z', 'SR')),
  tax_rate DECIMAL(5,2) NOT NULL,
  taxable_amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL
);

CREATE INDEX idx_tax_summary_invoice ON invoice_tax_summary(invoice_id);
