-- backend/migrations/004_create_products.sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  unit_price DECIMAL(15,4) NOT NULL,
  tax_type VARCHAR(3) NOT NULL CHECK (tax_type IN ('SST', 'E', 'Z', 'SR')),
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_exemption_reason VARCHAR(200),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_tenant ON products(tenant_id, deleted_at);
