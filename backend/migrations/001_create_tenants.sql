-- backend/migrations/001_create_tenants.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(200) NOT NULL,
  company_registration_no VARCHAR(50) NOT NULL,
  tin_number VARCHAR(20) NOT NULL,
  sst_registration_no VARCHAR(50),
  business_activity_code VARCHAR(10) NOT NULL,
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  postcode VARCHAR(10) NOT NULL,
  state_code VARCHAR(2) NOT NULL,
  country_code VARCHAR(2) NOT NULL DEFAULT 'MY',
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  myinvois_client_id VARCHAR(255),
  myinvois_client_secret VARCHAR(255),
  myinvois_access_token TEXT,
  myinvois_token_expiry TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
