-- backend/migrations/006_create_invoice_items.sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  tax_type VARCHAR(3) NOT NULL CHECK (tax_type IN ('SST', 'E', 'Z', 'SR')),
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL,
  tax_exemption_reason VARCHAR(200),
  line_total DECIMAL(15,2) NOT NULL
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
