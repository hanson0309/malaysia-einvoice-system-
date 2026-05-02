# Malaysia E-Invoice System - Design Specification

**Date:** 2026-05-02  
**Status:** Approved  
**Version:** 1.0

## 1. Executive Summary

This document specifies the design for a Malaysia e-invoice system that automates invoice submission to LHDN (Lembaga Hasil Dalam Negeri) via the MyInvois API. The system is a multi-tenant SaaS application supporting both B2B and B2C invoicing with full compliance to Malaysian e-invoice regulations.

### Key Features
- Multi-tenant architecture (multiple companies)
- Automated submission to MyInvois API (LHDN)
- Real-time and batch submission modes
- Automatic retry mechanism for failed submissions
- Full business data management (customers, products, inventory, invoices)
- Comprehensive dashboard with analytics
- Role-based access control
- PDPA compliance

### Technology Stack
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express.js + TypeScript
- **Database:** PostgreSQL
- **Job Queue:** Bull (in-memory)
- **Authentication:** JWT

## 2. System Architecture

### Architecture Pattern
Monolithic full-stack application with clear module separation:
- Authentication Module
- Invoice Module
- Customer Module
- Product Module
- LHDN Integration Module
- Analytics Module
- Background Job Module

### High-Level Flow
```
User (React UI) 
  ↓
Express API (JWT Auth + Tenant Isolation)
  ↓
PostgreSQL Database
  ↓
Background Worker (Bull Queue)
  ↓
MyInvois API (LHDN)
```

### Multi-Tenancy Strategy
- Each company = one tenant
- All tables include `tenant_id` for data isolation
- JWT tokens contain `tenant_id`
- Middleware enforces tenant isolation on every query
- Unique constraints scoped by tenant

## 3. Database Schema

### 3.1 Tenants (Company/Supplier Details)
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(200) NOT NULL,
  company_registration_no VARCHAR(50) NOT NULL,
  tin_number VARCHAR(20) NOT NULL,
  sst_registration_no VARCHAR(50),
  business_activity_code VARCHAR(10) NOT NULL, -- MSIC code
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  postcode VARCHAR(10) NOT NULL,
  state_code VARCHAR(2) NOT NULL, -- 01-16 Malaysia codes
  country_code VARCHAR(2) NOT NULL DEFAULT 'MY', -- ISO 3166-1
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  myinvois_client_id VARCHAR(255), -- encrypted
  myinvois_client_secret VARCHAR(255), -- encrypted
  myinvois_access_token TEXT, -- encrypted, cached
  myinvois_token_expiry TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 3.2 Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'accountant', 'viewer')),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id, deleted_at);
```

### 3.3 Customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  registration_no VARCHAR(50) NOT NULL, -- NRIC/BRN/Passport
  id_type VARCHAR(20) NOT NULL CHECK (id_type IN ('NRIC', 'PASSPORT', 'BRN', 'ARMY')),
  tin_number VARCHAR(20), -- Required for B2B
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  postcode VARCHAR(10),
  state_code VARCHAR(2), -- Malaysia codes
  country_code VARCHAR(2) NOT NULL DEFAULT 'MY',
  customer_type VARCHAR(3) NOT NULL CHECK (customer_type IN ('B2B', 'B2C')),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id, deleted_at);
```

### 3.4 Products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

### 3.5 Invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_number VARCHAR(50) NOT NULL,
  internal_reference_no VARCHAR(50),
  invoice_type VARCHAR(2) NOT NULL CHECK (invoice_type IN ('01', '02', '03', '04')),
  -- 01=Invoice, 02=Credit Note, 03=Debit Note, 04=Refund
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
```

### 3.6 Invoice Items
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

### 3.7 Invoice Tax Summary
```sql
CREATE TABLE invoice_tax_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tax_type VARCHAR(3) NOT NULL CHECK (tax_type IN ('SST', 'E', 'Z', 'SR')),
  tax_rate DECIMAL(5,2) NOT NULL,
  taxable_amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL
);

CREATE INDEX idx_tax_summary_invoice ON invoice_tax_summary(invoice_id);
```

### 3.8 Submission Logs
```sql
CREATE TABLE submission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

### 3.9 Attachments
```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'xml', 'json')),
  file_url VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_invoice ON attachments(invoice_id);
```

### 3.10 Audit Logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'submit')),
  old_data JSONB,
  new_data JSONB NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at);
```

### 3.11 Webhook Events (Future-Ready)
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_processed ON webhook_events(processed, created_at);
```

## 4. API Architecture

### 4.1 API Structure
- RESTful API with `/api/v1` prefix
- JWT authentication on all routes (except auth endpoints)
- Tenant isolation via middleware (extracts `tenant_id` from JWT)
- Standard response format with proper HTTP status codes

### 4.2 Core API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new company (tenant)
- `POST /api/v1/auth/login` - User login, returns JWT
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Invalidate token

#### Tenant Management
- `GET /api/v1/tenant/profile` - Get company profile
- `PUT /api/v1/tenant/profile` - Update company details
- `PUT /api/v1/tenant/myinvois-credentials` - Update MyInvois API credentials

#### Users
- `GET /api/v1/users` - List users (admin only)
- `POST /api/v1/users` - Create user (admin only)
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Soft delete user

#### Customers
- `GET /api/v1/customers` - List customers (paginated, searchable)
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers/:id` - Get customer details
- `PUT /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Soft delete customer

#### Products
- `GET /api/v1/products` - List products (paginated, searchable)
- `POST /api/v1/products` - Create product
- `GET /api/v1/products/:id` - Get product details
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Soft delete product

#### Invoices (Core Flow)
- `GET /api/v1/invoices` - List invoices (paginated, filterable by status/date)
- `POST /api/v1/invoices` - Create invoice (status: draft)
- `GET /api/v1/invoices/:id` - Get invoice details with items
- `PUT /api/v1/invoices/:id` - Update invoice (only if status = draft)
- `POST /api/v1/invoices/:id/validate` - Validate invoice before submission
- `POST /api/v1/invoices/:id/submit` - Submit to LHDN (queues background job)
- `POST /api/v1/invoices/:id/cancel` - Cancel invoice in LHDN
- `GET /api/v1/invoices/:id/pdf` - Download invoice PDF
- `GET /api/v1/invoices/:id/qr` - Get QR code image

#### Batch Operations
- `POST /api/v1/invoices/batch/submit` - Submit multiple invoices (body: array of invoice IDs)
- `GET /api/v1/invoices/batch/:batchId/status` - Check batch submission status

#### Analytics & Reports
- `GET /api/v1/analytics/dashboard` - Dashboard summary (total invoices, revenue, pending submissions)
- `GET /api/v1/analytics/revenue` - Revenue trends (by date range)
- `GET /api/v1/analytics/tax-summary` - Tax breakdown report
- `GET /api/v1/reports/invoices` - Export invoices (CSV/Excel)
- `GET /api/v1/reports/tax-compliance` - Monthly/quarterly tax report

#### Submission Logs
- `GET /api/v1/invoices/:id/logs` - Get submission history for invoice

### 4.3 Background Job Flow
1. User calls `POST /api/v1/invoices/:id/submit`
2. API validates invoice, sets status = "validated"
3. API queues job with invoice ID, returns immediately
4. Background worker picks up job
5. Worker calls MyInvois API
6. On success: updates status = "submitted", saves LHDN response
7. On failure: updates status = "submitted" (with error), schedules retry

### 4.4 Retry Logic
- Exponential backoff: 1min, 5min, 15min, 1hr, 6hr
- Max 6 retries
- Only retry if `retryable = true` (network errors, timeouts)
- Don't retry validation errors (400 responses)

## 5. MyInvois Integration & LHDN Submission

### 5.1 Authentication Flow
1. Use OAuth2 client credentials flow
2. Exchange `client_id` + `client_secret` for `access_token`
3. Cache token in database (`myinvois_access_token`, `myinvois_token_expiry`)
4. Refresh token automatically before expiry
5. Middleware checks token validity before each API call

### 5.2 Key MyInvois Endpoints
- `POST /connect/token` - Get access token
- `POST /api/v1.0/documents` - Submit single invoice
- `POST /api/v1.0/documents/batch` - Submit batch invoices
- `GET /api/v1.0/documents/{uuid}` - Get document status
- `PUT /api/v1.0/documents/{uuid}/state` - Cancel/reject document
- `GET /api/v1.0/documents/{uuid}/details` - Get full document details

### 5.3 Invoice Submission Payload Mapping
- Map `invoice_type` to MyInvois document type codes
- Convert `tenants` data to supplier object (TIN, address, MSIC)
- Convert `customers` data to buyer object (TIN, registration, address)
- Map `invoice_items` to line items array
- Include `invoice_tax_summary` as tax breakdown
- Generate internal UUID for tracking
- Include payment info if available

### 5.4 Submission Flow (Realtime)
1. Validate invoice data against MyInvois schema
2. Check tenant has valid MyInvois credentials
3. Ensure access token is valid (refresh if needed)
4. Build MyInvois JSON payload
5. Call `POST /api/v1.0/documents`
6. Parse response:
   - Success: Save `submission_uid`, `validation_code`, `qr_code`, set status = "submitted"
   - Validation error: Save error, set status = "rejected", don't retry
   - Network/timeout: Save error, set status = "submitted", schedule retry
7. Log full request/response to `submission_logs`
8. Generate PDF with QR code
9. Create audit log entry

### 5.5 Submission Flow (Batch)
1. Collect multiple invoices (max 100 per batch per MyInvois limits)
2. Validate all invoices
3. Build batch payload
4. Call `POST /api/v1.0/documents/batch`
5. MyInvois returns batch ID
6. Poll batch status endpoint
7. Update individual invoice statuses based on batch results

### 5.6 Error Handling

**Retryable Errors (set retryable = true):**
- HTTP 500, 502, 503, 504 (server errors)
- Network timeout
- Connection refused
- Token expired (refresh and retry immediately)

**Non-Retryable Errors (set retryable = false):**
- HTTP 400 (validation error - bad data)
- HTTP 401 (invalid credentials)
- HTTP 403 (forbidden - wrong permissions)
- Duplicate submission (invoice already exists in LHDN)

### 5.7 Retry Strategy
- Use `retry_count` and `next_retry_at` fields
- Schedule: 1min, 5min, 15min, 1hr, 6hr
- After 6 failed retries, mark as "failed" and notify admin
- Background worker queries: `SELECT * FROM invoices WHERE status = 'submitted' AND next_retry_at <= NOW() AND retry_count < 6`

### 5.8 QR Code & Validation
- MyInvois returns validation URL/code
- Generate QR code image (use library like `qrcode`)
- Store QR as base64 or upload to cloud storage
- Display QR on invoice PDF for customer verification

## 6. Frontend UI & User Experience

### 6.1 Technology Stack
- React 18 with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- React Query for data fetching & caching
- Recharts for analytics visualization
- React Hook Form for form validation

### 6.2 Main UI Pages

**Dashboard (Landing Page)**
- Summary cards: Total invoices, Revenue (MTD), Pending submissions, Failed submissions
- Recent invoices table (last 10)
- Revenue chart (last 6 months)
- Submission status pie chart
- Quick actions: Create Invoice, View Reports

**Invoice List Page**
- Data table with columns: Invoice #, Customer, Date, Amount, Status, Actions
- Filters: Status (draft/submitted/accepted/rejected), Date range, Customer
- Search by invoice number or customer name
- Pagination (20 per page)
- Bulk actions: Select multiple → Submit batch
- Status badges with colors: Draft (gray), Validated (blue), Submitted (yellow), Accepted (green), Rejected (red), Cancelled (gray)

**Create/Edit Invoice Page**
- Multi-step form or single page with sections:
  - Section 1: Invoice details (type, date, due date, customer selector)
  - Section 2: Line items (add products, quantity, price, tax)
  - Section 3: Payment info (method, terms, optional paid amount)
  - Section 4: Review & totals (subtotal, tax breakdown, total)
- Real-time calculation of totals
- Save as draft button
- Validate button (checks MyInvois rules)
- Submit button (queues LHDN submission)

**Invoice Detail Page**
- Invoice header (number, customer, dates, status)
- Line items table
- Tax summary breakdown
- Payment information
- LHDN submission details: Submission UID, Submitted timestamp, QR code display, Validation code
- Action buttons: Download PDF, View QR Code (modal), Submit to LHDN (if draft), Retry submission (if failed), Cancel invoice (if submitted)
- Submission logs timeline (all attempts with timestamps)

**Customer Management**
- Customer list with search/filter
- Add/Edit customer form with validation (required fields for B2B vs B2C, TIN validation, address fields with state dropdown)
- Import customers (CSV upload)

**Product Management**
- Product list with search
- Add/Edit product form
- Tax type selector with conditional fields (exemption reason if rate = 0)
- Bulk import products (CSV)

**Analytics & Reports Page**
- Date range selector
- Revenue trends chart (line chart)
- Tax breakdown (pie chart by tax type)
- Top customers table
- Invoice status distribution
- Export buttons (CSV, Excel, PDF)

**Settings Page**
- Company Profile: Edit tenant details, address, MSIC, SST
- MyInvois Credentials: Update client ID/secret (encrypted input)
- Users: Manage team members, roles
- Preferences: Date format, currency display

### 6.3 Key UX Features
- Real-time status updates (poll API every 5 seconds after submission)
- Toast notifications for status changes
- Inline validation on forms
- Pre-submission validation check
- Error details modal with retry button
- Responsive design (mobile-friendly)
- Skeleton loaders for tables
- Disabled buttons during API calls

## 7. Background Job Processing

### 7.1 Job Queue Architecture
Use `bull` library with in-memory storage (no Redis needed for monolith):
- API adds jobs to queue when invoice submitted
- Worker process consumes jobs from queue
- Automatic retry with exponential backoff
- Job persistence in database (invoices table tracks state)

### 7.2 Job Types
1. `submit-invoice` - Submit single invoice to MyInvois
2. `submit-batch` - Submit multiple invoices in batch
3. `retry-failed` - Retry failed submissions
4. `refresh-token` - Refresh MyInvois access token

### 7.3 Worker Process
- Separate Node.js process (worker.js)
- Connects to same PostgreSQL database
- Processes jobs from queue
- Updates invoice status
- Logs all attempts
- Sends notifications on final failure

### 7.4 Retry Decision Tree
```
Submit to MyInvois
├─ Success (200/201) → Update status = "submitted", save response, done
├─ Validation Error (400) → Update status = "rejected", save error, DON'T retry
├─ Auth Error (401/403)
│  ├─ If token expired: Refresh token, retry immediately
│  └─ If invalid credentials: Mark failed, notify admin
├─ Server Error (500/502/503/504) → Set retryable = true, schedule next retry
└─ Network Error (timeout, connection refused) → Set retryable = true, schedule next retry
```

### 7.5 Job Processing Flow
1. Worker picks job from queue
2. Load invoice from database
3. Check retry count (skip if >= 6)
4. Validate tenant has MyInvois credentials
5. Check/refresh access token
6. Build MyInvois payload
7. Call MyInvois API
8. Parse response
9. Update invoice status
10. Log to submission_logs
11. If retryable error: Calculate next_retry_at, increment retry_count
12. If final failure: Send email notification to admin
13. Mark job as complete

## 8. Security & Data Protection

### 8.1 Authentication & Authorization

**JWT Token Structure:**
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "exp": 1234567890
}
```

**Token Security:**
- Access token expiry: 1 hour
- Refresh token expiry: 7 days
- Store refresh tokens in database
- Rotate refresh tokens on each use
- Invalidate all tokens on password change

**Role-Based Access Control:**
- **Admin:** Full access, manage users, update company profile, configure MyInvois credentials
- **Accountant:** Create/edit/submit invoices, manage customers/products, view reports
- **Viewer:** Read-only access, view invoices/customers/products/reports

**Middleware:**
- `authenticateJWT` - Validates token on all protected routes
- `extractTenant` - Extracts tenant_id from JWT, adds to request context
- `requireRole(['admin', 'accountant'])` - Checks user role
- `tenantIsolation` - Automatically adds `WHERE tenant_id = ?` to all queries

### 8.2 Data Encryption

**At Rest:**
- Encrypt: `myinvois_client_secret`, `myinvois_access_token` (AES-256)
- Password hash: bcrypt with salt rounds = 12
- Use environment variable for encryption key
- Never log decrypted credentials

**In Transit:**
- HTTPS only (TLS 1.2+)
- Enforce HTTPS redirect
- HSTS headers enabled

### 8.3 API Security

**Rate Limiting:**
- 100 requests per minute per user
- 1000 requests per hour per tenant
- Stricter limits on auth endpoints (5 login attempts per 15 minutes)

**Input Validation:**
- Validate all inputs with Joi/Zod schemas
- Sanitize user inputs to prevent XSS
- Use parameterized queries (prevent SQL injection)
- Validate file uploads (type, size limits)

**CORS Configuration:**
- Whitelist frontend domain only
- No wildcard origins in production

**Security Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` (restrict script sources)

### 8.4 Tenant Isolation
- Every query includes `tenant_id` filter
- Middleware automatically injects tenant_id
- Unique constraints include tenant_id
- Foreign keys respect tenant boundaries
- Before any operation, verify resource belongs to tenant

### 8.5 Audit Trail
- Log all sensitive operations to `audit_logs`
- Track: Who, What, When, Old Value, New Value
- Immutable logs (no updates/deletes)
- Retention: 7 years (compliance requirement)

### 8.6 Secrets Management
- Store secrets in environment variables (`.env` file)
- Never commit `.env` to git
- Use different secrets for dev/staging/production
- Rotate MyInvois credentials periodically

### 8.7 Backup & Recovery
- Daily automated database backups
- Encrypted backup storage
- Test restore process monthly
- Point-in-time recovery capability

### 8.8 Compliance
- PDPA (Malaysia Personal Data Protection Act) compliance
- Data retention policies
- Right to deletion (soft delete with anonymization)
- Data export capability

## 9. Error Handling & Validation

### 9.1 Frontend Validation

**Form-Level Validation (React Hook Form):**
- Required fields marked with asterisk
- Real-time validation on blur
- Display error messages below fields
- Disable submit button until form valid

**Field-Specific Rules:**

**Invoice Form:**
- Invoice number: Required, alphanumeric, max 50 chars
- Customer: Required, must exist in database
- Issue date: Required, cannot be future date
- Due date: Must be >= issue date
- Line items: At least 1 item required
- Quantity: Positive number, max 2 decimals
- Unit price: Positive number, max 4 decimals
- Tax rate: 0-100%, max 2 decimals

**Customer Form:**
- Name: Required, max 200 chars
- Email: Valid email format (for B2B)
- TIN: Required for B2B, 12 digits
- Registration no: Required, format based on id_type (NRIC: 12 digits, BRN: Alphanumeric, Passport: Alphanumeric)
- Address: Required for B2B
- State code: Must be valid Malaysia state code (01-16)
- Country code: ISO 3166-1 format

**Product Form:**
- Name: Required, max 200 chars
- SKU: Optional, unique per tenant
- Unit price: Positive number
- Tax type: Required (SST/E/Z/SR)
- Tax exemption reason: Required if tax_rate = 0

### 9.2 Backend Validation

**API Request Validation (Express Validator / Zod):**
- Validate all request bodies, params, query strings
- Return 400 with detailed error messages
- Example error response:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "customer.tin_number",
      "message": "TIN must be 12 digits for B2B customers"
    }
  ]
}
```

**Business Logic Validation (Before Invoice Submission):**
1. Check invoice status = "draft" or "validated"
2. Verify customer has complete data (TIN for B2B, address, etc.)
3. Verify tenant has MyInvois credentials configured
4. Validate line items have valid tax types
5. Verify totals calculated correctly
6. Check for duplicate invoice_number
7. If credit/debit note, verify original_invoice_id exists

**MyInvois Payload Validation:**
- Validate against MyInvois JSON schema
- Check required fields present
- Verify data formats (dates, amounts, codes)
- Validate tax calculations match line items
- Pre-submission validation endpoint: `POST /api/v1/invoices/:id/validate`

### 9.3 Error Response Structure

**Standard Error Format:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2026-05-02T10:30:00Z"
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Invalid/expired token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `DUPLICATE` - Resource already exists
- `LHDN_VALIDATION_ERROR` - MyInvois rejected invoice
- `LHDN_SERVER_ERROR` - MyInvois API error
- `NETWORK_ERROR` - Connection failed
- `INTERNAL_ERROR` - Unexpected server error

### 9.4 Error Handling by Layer

**Frontend:**
- Display toast notifications for errors
- Show inline errors on forms
- Provide actionable error messages
- Offer retry button for network errors
- Log errors to console (dev mode only)

**API Layer:**
- Catch all errors with global error handler
- Log errors with stack traces
- Return appropriate HTTP status codes
- Never expose internal details in production
- Sanitize error messages

**Database Layer:**
- Handle unique constraint violations
- Handle foreign key violations
- Catch connection errors
- Transaction rollback on errors

**MyInvois Integration Layer:**
- Parse LHDN error codes
- Map to user-friendly messages
- Determine if retryable
- Log full request/response for debugging

### 9.5 Common LHDN Error Scenarios

**Validation Errors (Don't Retry):**
- Invalid TIN format
- Missing required fields
- Invalid tax calculation
- Duplicate invoice submission
- Invalid document type

**Retryable Errors:**
- API timeout
- Server overload (503)
- Network connection lost
- Token expired (refresh and retry)

### 9.6 User-Facing Error Messages
- "Invoice validation failed: Customer TIN is invalid"
- "Submission failed: LHDN API is temporarily unavailable. Will retry automatically."
- "Cannot submit: Please configure MyInvois credentials in Settings"
- "Duplicate invoice: This invoice number already exists in LHDN"

### 9.7 Logging Strategy
- Log all API requests (method, path, user, tenant)
- Log all errors with stack traces
- Log all MyInvois API calls (request/response)
- Use structured logging (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG
- Store logs for 90 days

## 10. Deployment & Infrastructure

### 10.1 Environment Setup
- **Development:** Local machine with PostgreSQL
- **Staging:** Cloud hosting (AWS/Azure/DigitalOcean) for testing
- **Production:** Cloud hosting with auto-scaling

### 10.2 Required Services
- **Web Server:** Node.js application (API + Frontend served as static files)
- **Database:** PostgreSQL 14+
- **Worker:** Separate Node.js process for background jobs
- **File Storage:** Cloud storage (AWS S3 / Azure Blob) for PDFs and attachments

### 10.3 Environment Variables
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=random-secret-key
JWT_REFRESH_SECRET=random-refresh-secret
ENCRYPTION_KEY=aes-256-encryption-key
MYINVOIS_BASE_URL=https://api.myinvois.hasil.gov.my
FRONTEND_URL=https://yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 10.4 Deployment Process
1. Build frontend: `npm run build` (creates static files)
2. Run database migrations
3. Deploy backend API
4. Deploy worker process
5. Configure reverse proxy (Nginx)
6. Enable HTTPS with SSL certificate
7. Set up monitoring and alerts

### 10.5 Monitoring & Alerts
- Application performance monitoring (APM)
- Database query performance
- API response times
- Background job success/failure rates
- MyInvois API availability
- Disk space and memory usage

## 11. Testing Strategy

### 11.1 Unit Tests
- Test individual functions and modules
- Mock external dependencies (database, MyInvois API)
- Test validation logic
- Test calculation functions (tax, totals)

### 11.2 Integration Tests
- Test API endpoints with real database
- Test authentication and authorization
- Test tenant isolation
- Test MyInvois integration (with mock server)

### 11.3 End-to-End Tests
- Test complete user workflows
- Create invoice → Submit → Verify status
- Test error scenarios and retries
- Test batch submissions

## 12. Future Enhancements

### 12.1 Phase 2 Features (Post-MVP)
- Email notifications for invoice status changes
- SMS notifications for customers
- Recurring invoices (auto-generate monthly)
- Invoice templates with custom branding
- Multi-currency support with live exchange rates
- Mobile app (React Native)
- API for third-party integrations
- Webhook support for external systems

### 12.2 Advanced Analytics
- Predictive analytics (revenue forecasting)
- Customer segmentation
- Payment behavior analysis
- Tax optimization recommendations

### 12.3 Integration Opportunities
- Accounting software (QuickBooks, Xero)
- Payment gateways (Stripe, PayPal, iPay88)
- CRM systems (Salesforce, HubSpot)
- Inventory management systems

## 13. Success Metrics

### 13.1 Technical Metrics
- API response time < 200ms (95th percentile)
- MyInvois submission success rate > 95%
- System uptime > 99.5%
- Background job processing time < 30 seconds
- Database query performance < 100ms

### 13.2 Business Metrics
- Number of active tenants
- Total invoices submitted per month
- Average invoices per tenant
- User retention rate
- Customer satisfaction score

## 14. Risks & Mitigation

### 14.1 Technical Risks
- **MyInvois API downtime:** Implement retry mechanism with exponential backoff
- **Database performance:** Add proper indexes, implement query optimization
- **Data loss:** Daily backups with point-in-time recovery
- **Security breach:** Encryption, regular security audits, penetration testing

### 14.2 Business Risks
- **Regulatory changes:** Monitor LHDN announcements, maintain flexible architecture
- **Competition:** Focus on user experience and reliability
- **Scalability:** Design for horizontal scaling from day one

## 15. Timeline Estimate

### Phase 1: MVP (8-10 weeks)
- Week 1-2: Database setup, authentication, tenant management
- Week 3-4: Customer and product management
- Week 5-6: Invoice creation and management
- Week 7-8: MyInvois integration and submission
- Week 9: Background jobs and retry mechanism
- Week 10: Testing, bug fixes, deployment

### Phase 2: Analytics & Reports (2-3 weeks)
- Dashboard with charts
- Export functionality
- Tax compliance reports

### Phase 3: Polish & Launch (1-2 weeks)
- UI/UX improvements
- Performance optimization
- Documentation
- User onboarding

**Total Estimated Time: 11-15 weeks**

---

**End of Design Document**