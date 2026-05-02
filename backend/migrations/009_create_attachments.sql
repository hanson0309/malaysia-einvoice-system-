-- backend/migrations/009_create_attachments.sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'xml', 'json')),
  file_url VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_invoice ON attachments(invoice_id);
