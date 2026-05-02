-- backend/migrations/003_create_customers.sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  registration_no VARCHAR(50) NOT NULL,
  id_type VARCHAR(20) NOT NULL CHECK (id_type IN ('NRIC', 'PASSPORT', 'BRN', 'ARMY')),
  tin_number VARCHAR(20),
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  postcode VARCHAR(10),
  state_code VARCHAR(2),
  country_code VARCHAR(2) NOT NULL DEFAULT 'MY',
  customer_type VARCHAR(3) NOT NULL CHECK (customer_type IN ('B2B', 'B2C')),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id, deleted_at);
