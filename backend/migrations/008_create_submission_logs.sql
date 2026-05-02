-- backend/migrations/008_create_submission_logs.sql
CREATE TABLE submission_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  submission_type VARCHAR(10) NOT NULL CHECK (submission_type IN ('realtime', 'batch')),
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  http_status_code INT,
  status VARCHAR(10) NOT NULL CHECK (status IN ('success', 'failed')),
  error_code VARCHAR(50),
  retryable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_logs_invoice ON submission_logs(invoice_id, created_at);
