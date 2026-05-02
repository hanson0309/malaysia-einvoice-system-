# Malaysia E-Invoice System MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant e-invoice system that automates submission to Malaysia's LHDN via MyInvois API with automatic retry mechanism.

**Architecture:** Monolithic Node.js/Express backend with React frontend, PostgreSQL database, Bull queue for background jobs. Multi-tenant isolation via JWT tokens and database-level tenant_id filtering.

**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL, React 18, Tailwind CSS, Bull, JWT, bcrypt, Zod

---

## File Structure

### Backend (`/backend`)
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # PostgreSQL connection
│   │   ├── env.ts                # Environment variables
│   │   └── queue.ts              # Bull queue setup
│   ├── middleware/
│   │   ├── auth.ts               # JWT authentication
│   │   ├── tenant.ts             # Tenant isolation
│   │   ├── errorHandler.ts      # Global error handler
│   │   └── validation.ts        # Request validation
│   ├── models/
│   │   ├── tenant.ts             # Tenant model
│   │   ├── user.ts               # User model
│   │   ├── customer.ts           # Customer model
│   │   ├── product.ts            # Product model
│   │   ├── invoice.ts            # Invoice model
│   │   └── index.ts              # Model exports
│   ├── routes/
│   │   ├── auth.ts               # Auth endpoints
│   │   ├── tenants.ts            # Tenant management
│   │   ├── users.ts              # User management
│   │   ├── customers.ts          # Customer CRUD
│   │   ├── products.ts           # Product CRUD
│   │   ├── invoices.ts           # Invoice CRUD + submission
│   │   └── index.ts              # Route aggregator
│   ├── services/
│   │   ├── myinvois.ts           # MyInvois API client
│   │   ├── encryption.ts         # AES-256 encryption
│   │   ├── pdf.ts                # PDF generation
│   │   └── qrcode.ts             # QR code generation
│   ├── jobs/
│   │   ├── submitInvoice.ts      # Invoice submission job
│   │   └── retryFailed.ts        # Retry failed submissions
│   ├── utils/
│   │   ├── logger.ts             # Structured logging
│   │   └── errors.ts             # Custom error classes
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # HTTP server
│   └── worker.ts                 # Background worker
├── migrations/
│   ├── 001_create_tenants.sql
│   ├── 002_create_users.sql
│   ├── 003_create_customers.sql
│   ├── 004_create_products.sql
│   ├── 005_create_invoices.sql
│   ├── 006_create_invoice_items.sql
│   ├── 007_create_invoice_tax_summary.sql
│   ├── 008_create_submission_logs.sql
│   ├── 009_create_attachments.sql
│   ├── 010_create_audit_logs.sql
│   └── 011_create_webhook_events.sql
├── tests/
│   ├── unit/
│   ├── integration/
│   └── setup.ts
├── package.json
├── tsconfig.json
└── .env.example
```

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Toast.tsx
│   │   ├── invoices/
│   │   │   ├── InvoiceList.tsx
│   │   │   ├── InvoiceForm.tsx
│   │   │   ├── InvoiceDetail.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── customers/
│   │   │   ├── CustomerList.tsx
│   │   │   └── CustomerForm.tsx
│   │   └── products/
│   │       ├── ProductList.tsx
│   │       └── ProductForm.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Invoices.tsx
│   │   ├── Customers.tsx
│   │   ├── Products.tsx
│   │   └── Settings.tsx
│   ├── services/
│   │   └── api.ts               # Axios client
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useToast.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Task 1: Project Initialization

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`

- [ ] **Step 1: Initialize backend project**

```bash
mkdir -p backend frontend
cd backend
npm init -y
```

- [ ] **Step 2: Install backend dependencies**

```bash
npm install express cors helmet dotenv pg bcrypt jsonwebtoken zod bull qrcode pdfkit
npm install -D typescript @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken ts-node nodemon
```

- [ ] **Step 3: Create backend tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create backend .env.example**

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/einvoice
JWT_SECRET=your-jwt-secret-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
ENCRYPTION_KEY=your-32-char-encryption-key-here
MYINVOIS_BASE_URL=https://api.myinvois.hasil.gov.my
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 5: Initialize frontend project**

```bash
cd ../frontend
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 6: Install frontend dependencies**

```bash
npm install react-router-dom axios react-hook-form zod @hookform/resolvers recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 7: Configure Tailwind CSS**

```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: initialize backend and frontend projects

- Set up Node.js/Express backend with TypeScript
- Set up React/Vite frontend with TypeScript and Tailwind
- Add all required dependencies"
```

## Task 2: Database Setup & Migrations

**Files:**
- Create: `backend/src/config/database.ts`
- Create: `backend/migrations/001_create_tenants.sql`
- Create: `backend/migrations/002_create_users.sql`
- Create: `backend/migrations/003_create_customers.sql`
- Create: `backend/migrations/004_create_products.sql`
- Create: `backend/migrations/005_create_invoices.sql`
- Create: `backend/migrations/006_create_invoice_items.sql`
- Create: `backend/migrations/007_create_invoice_tax_summary.sql`
- Create: `backend/migrations/008_create_submission_logs.sql`
- Create: `backend/migrations/009_create_attachments.sql`
- Create: `backend/migrations/010_create_audit_logs.sql`
- Create: `backend/migrations/011_create_webhook_events.sql`
- Create: `backend/scripts/migrate.ts`

- [ ] **Step 1: Create database connection module**

```typescript
// backend/src/config/database.ts
import { Pool } from 'pg';
import { config } from './env';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
```

- [ ] **Step 2: Create tenants table migration**

```sql
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
```

- [ ] **Step 3: Create users table migration**

```sql
-- backend/migrations/002_create_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

- [ ] **Step 4: Create customers table migration**

```sql
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
```

- [ ] **Step 5: Create products table migration**

```sql
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
```

- [ ] **Step 6: Create invoices table migration**

```sql
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
```

- [ ] **Step 7: Create invoice_items table migration**

```sql
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
```

- [ ] **Step 8: Create invoice_tax_summary table migration**

```sql
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
```

- [ ] **Step 9: Create submission_logs table migration**

```sql
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
```

- [ ] **Step 10: Create attachments table migration**

```sql
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
```

- [ ] **Step 11: Create audit_logs table migration**

```sql
-- backend/migrations/010_create_audit_logs.sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

- [ ] **Step 12: Create webhook_events table migration**

```sql
-- backend/migrations/011_create_webhook_events.sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_processed ON webhook_events(processed, created_at);
```

- [ ] **Step 13: Create migration script**

```typescript
// backend/scripts/migrate.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/config/database';

async function runMigrations() {
  const migrations = [
    '001_create_tenants.sql',
    '002_create_users.sql',
    '003_create_customers.sql',
    '004_create_products.sql',
    '005_create_invoices.sql',
    '006_create_invoice_items.sql',
    '007_create_invoice_tax_summary.sql',
    '008_create_submission_logs.sql',
    '009_create_attachments.sql',
    '010_create_audit_logs.sql',
    '011_create_webhook_events.sql',
  ];

  for (const migration of migrations) {
    console.log(`Running migration: ${migration}`);
    const sql = readFileSync(join(__dirname, '../migrations', migration), 'utf8');
    await pool.query(sql);
    console.log(`✓ ${migration} completed`);
  }

  console.log('All migrations completed successfully');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 14: Run migrations**

```bash
cd backend
npx ts-node scripts/migrate.ts
```

Expected: All tables created successfully

- [ ] **Step 15: Commit**

```bash
git add backend/migrations backend/src/config/database.ts backend/scripts/migrate.ts
git commit -m "feat: add database schema and migrations

- Create all 11 database tables with proper constraints
- Add indexes for performance
- Set up database connection pool
- Add migration runner script"
```

## Task 3: Environment Config & Utilities

**Files:**
- Create: `backend/src/config/env.ts`
- Create: `backend/src/utils/logger.ts`
- Create: `backend/src/utils/errors.ts`
- Create: `backend/src/services/encryption.ts`

- [ ] **Step 1: Create environment configuration**

```typescript
// backend/src/config/env.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  MYINVOIS_BASE_URL: process.env.MYINVOIS_BASE_URL || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

// Validate required env vars
const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
for (const key of required) {
  if (!config[key as keyof typeof config]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

- [ ] **Step 2: Create logger utility**

```typescript
// backend/src/utils/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'INFO',
      message,
      meta,
      timestamp: new Date().toISOString(),
    }));
  },
  
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    }));
  },
  
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      message,
      meta,
      timestamp: new Date().toISOString(),
    }));
  },
  
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'DEBUG',
        message,
        meta,
        timestamp: new Date().toISOString(),
      }));
    }
  },
};
```

- [ ] **Step 3: Create custom error classes**

```typescript
// backend/src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class DuplicateError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'DUPLICATE', details);
    this.name = 'DuplicateError';
  }
}

export class LHDNValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'LHDN_VALIDATION_ERROR', details);
    this.name = 'LHDNValidationError';
  }
}

export class LHDNServerError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 502, 'LHDN_SERVER_ERROR', details);
    this.name = 'LHDNServerError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 503, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}
```

- [ ] **Step 4: Create encryption service**

```typescript
// backend/src/services/encryption.ts
import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(config.ENCRYPTION_KEY, 'utf8').slice(0, 32);

export const encryption = {
  encrypt: (text: string): string => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },

  decrypt: (text: string): string => {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },
};
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/config/env.ts backend/src/utils backend/src/services/encryption.ts
git commit -m "feat: add environment config and utilities

- Add environment variable validation
- Add structured JSON logger
- Add custom error classes for different scenarios
- Add AES-256 encryption service for sensitive data"
```

## Task 4: Authentication & JWT Middleware

**Files:**
- Create: `backend/src/types/index.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/middleware/tenant.ts`
- Create: `backend/src/middleware/errorHandler.ts`
- Create: `backend/tests/unit/auth.test.ts`

- [ ] **Step 1: Create TypeScript types**

```typescript
// backend/src/types/index.ts
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
```

- [ ] **Step 2: Write test for JWT authentication**

```typescript
// backend/tests/unit/auth.test.ts
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/env';

describe('JWT Authentication', () => {
  it('should generate valid JWT token', () => {
    const payload = {
      user_id: '123',
      tenant_id: '456',
      email: 'test@example.com',
      role: 'admin',
    };

    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;

    expect(decoded.user_id).toBe('123');
    expect(decoded.tenant_id).toBe('456');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('admin');
  });

  it('should reject invalid token', () => {
    expect(() => {
      jwt.verify('invalid-token', config.JWT_SECRET);
    }).toThrow();
  });

  it('should reject expired token', () => {
    const payload = { user_id: '123' };
    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '0s' });

    setTimeout(() => {
      expect(() => {
        jwt.verify(token, config.JWT_SECRET);
      }).toThrow();
    }, 100);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend
npm install -D jest @types/jest ts-jest
npx jest tests/unit/auth.test.ts
```

Expected: Tests fail (middleware not implemented yet)

- [ ] **Step 4: Create authentication middleware**

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { JWTPayload } from '../types';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    next();
  };
};
```

- [ ] **Step 5: Create tenant isolation middleware**

```typescript
// backend/src/middleware/tenant.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const extractTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  req.tenantId = req.user.tenant_id;
  next();
};
```

- [ ] **Step 6: Create global error handler**

```typescript
// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
      timestamp: new Date().toISOString(),
    });
  }

  // Unexpected errors
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
};
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx jest tests/unit/auth.test.ts
```

Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add backend/src/types backend/src/middleware backend/tests/unit/auth.test.ts
git commit -m "feat: add authentication and middleware

- Add TypeScript types for all entities
- Add JWT authentication middleware
- Add role-based access control
- Add tenant isolation middleware
- Add global error handler
- Add unit tests for JWT"
```

## Task 5: Authentication Routes (Register & Login)

**Files:**
- Create: `backend/src/routes/auth.ts`
- Create: `backend/tests/integration/auth.test.ts`

- [ ] **Step 1: Write integration test for registration**

```typescript
// backend/tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/config/database';

describe('POST /api/v1/auth/register', () => {
  afterAll(async () => {
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM tenants');
    await pool.end();
  });

  it('should register new tenant and admin user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        company_name: 'Test Company',
        company_registration_no: 'REG123',
        tin_number: '123456789012',
        business_activity_code: '12345',
        address_line1: '123 Test St',
        city: 'Kuala Lumpur',
        postcode: '50000',
        state_code: '14',
        country_code: 'MY',
        email: 'admin@test.com',
        phone: '+60123456789',
        password: 'SecurePass123!',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
    expect(response.body.user).toHaveProperty('email', 'admin@test.com');
    expect(response.body.user).toHaveProperty('role', 'admin');
  });

  it('should reject duplicate email', async () => {
    const userData = {
      company_name: 'Test Company 2',
      company_registration_no: 'REG456',
      tin_number: '123456789013',
      business_activity_code: '12345',
      address_line1: '456 Test St',
      city: 'Kuala Lumpur',
      postcode: '50000',
      state_code: '14',
      country_code: 'MY',
      email: 'admin@test.com',
      phone: '+60123456790',
      password: 'SecurePass123!',
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('DUPLICATE');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'SecurePass123!',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'WrongPassword',
      });

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm install -D supertest @types/supertest
npx jest tests/integration/auth.test.ts
```

Expected: Tests fail (routes not implemented)

- [ ] **Step 3: Create auth routes**

```typescript
// backend/src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/database';
import { config } from '../config/env';
import { ValidationError, UnauthorizedError, DuplicateError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

const registerSchema = z.object({
  company_name: z.string().min(1).max(200),
  company_registration_no: z.string().min(1).max(50),
  tin_number: z.string().length(12),
  business_activity_code: z.string().min(1).max(10),
  address_line1: z.string().min(1).max(200),
  address_line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postcode: z.string().min(1).max(10),
  state_code: z.string().length(2),
  country_code: z.string().length(2).default('MY'),
  email: z.string().email().max(100),
  phone: z.string().min(1).max(20),
  password: z.string().min(8).max(100),
  sst_registration_no: z.string().max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [data.email]
    );

    if (existingUser.rows.length > 0) {
      throw new DuplicateError('Email already registered');
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 12);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create tenant
      const tenantResult = await client.query(
        `INSERT INTO tenants (
          company_name, company_registration_no, tin_number, sst_registration_no,
          business_activity_code, address_line1, address_line2, city, postcode,
          state_code, country_code, email, phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          data.company_name,
          data.company_registration_no,
          data.tin_number,
          data.sst_registration_no,
          data.business_activity_code,
          data.address_line1,
          data.address_line2,
          data.city,
          data.postcode,
          data.state_code,
          data.country_code,
          data.email,
          data.phone,
        ]
      );

      const tenant_id = tenantResult.rows[0].id;

      // Create admin user
      const userResult = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, role, created_at`,
        [tenant_id, data.email, password_hash, 'admin']
      );

      await client.query('COMMIT');

      const user = userResult.rows[0];

      // Generate tokens
      const access_token = jwt.sign(
        {
          user_id: user.id,
          tenant_id,
          email: user.email,
          role: user.role,
        },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refresh_token = jwt.sign(
        { user_id: user.id },
        config.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      logger.info('New tenant registered', { tenant_id, email: data.email });

      res.status(201).json({
        access_token,
        refresh_token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenant_id,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user
    const result = await pool.query(
      `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.role
       FROM users u
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [data.email]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const access_token = jwt.sign(
      {
        user_id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refresh_token = jwt.sign(
      { user_id: user.id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('User logged in', { user_id: user.id, email: user.email });

    res.json({
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

export default router;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/integration/auth.test.ts
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/auth.ts backend/tests/integration/auth.test.ts
git commit -m "feat: add authentication routes

- Add POST /api/v1/auth/register endpoint
- Add POST /api/v1/auth/login endpoint
- Add request validation with Zod
- Add password hashing with bcrypt
- Add JWT token generation
- Add integration tests"
```

## Task 6: Express App Setup

**Files:**
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/routes/index.ts`

- [ ] **Step 1: Create route aggregator**

```typescript
// backend/src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth';

const router = Router();

router.use('/auth', authRoutes);

export default router;
```

- [ ] **Step 2: Create Express app**

```typescript
// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

export const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);
```

- [ ] **Step 3: Create server entry point**

```typescript
// backend/src/server.ts
import { app } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { env: config.NODE_ENV });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});
```

- [ ] **Step 4: Add start scripts to package.json**

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "migrate": "ts-node scripts/migrate.ts"
  }
}
```

- [ ] **Step 5: Test server startup**

```bash
npm run dev
```

Expected: Server starts on port 3000

- [ ] **Step 6: Test health endpoint**

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 7: Commit**

```bash
git add backend/src/app.ts backend/src/server.ts backend/src/routes/index.ts backend/package.json
git commit -m "feat: set up Express app and server

- Add Express app with security middleware
- Add CORS configuration
- Add health check endpoint
- Add server entry point with error handling
- Add npm scripts for dev and production"
```

---

## Remaining Tasks Summary

Due to the comprehensive nature of this system, here's an overview of the remaining implementation tasks:

### Backend Tasks (7-15)
- **Task 7:** Customer CRUD routes and tests
- **Task 8:** Product CRUD routes and tests
- **Task 9:** Invoice CRUD routes (without submission)
- **Task 10:** MyInvois API client service
- **Task 11:** Invoice submission job and Bull queue setup
- **Task 12:** Background worker process
- **Task 13:** PDF generation service
- **Task 14:** QR code generation service
- **Task 15:** Tenant and user management routes

### Frontend Tasks (16-25)
- **Task 16:** React app setup with routing
- **Task 17:** Authentication context and API client
- **Task 18:** Login and Register pages
- **Task 19:** Dashboard page with summary cards
- **Task 20:** Customer list and form components
- **Task 21:** Product list and form components
- **Task 22:** Invoice list component
- **Task 23:** Invoice form component
- **Task 24:** Invoice detail page with submission
- **Task 25:** Settings page

### Integration & Testing (26-30)
- **Task 26:** End-to-end invoice submission flow test
- **Task 27:** Retry mechanism test
- **Task 28:** Multi-tenant isolation test
- **Task 29:** Performance testing
- **Task 30:** Deployment preparation

## Task 7: Customer CRUD Routes

**Files:**
- Create: `backend/src/routes/customers.ts`
- Create: `backend/tests/integration/customers.test.ts`

- [ ] **Step 1: Write integration test for customer creation**

```typescript
// backend/tests/integration/customers.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('Customer Routes', () => {
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    // Register and get token
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        company_name: 'Test Company',
        company_registration_no: 'REG123',
        tin_number: '123456789012',
        business_activity_code: '12345',
        address_line1: '123 Test St',
        city: 'Kuala Lumpur',
        postcode: '50000',
        state_code: '14',
        email: 'test@example.com',
        phone: '+60123456789',
        password: 'SecurePass123!',
      });

    authToken = response.body.access_token;
    tenantId = response.body.user.tenant_id;
  });

  it('should create B2B customer', async () => {
    const response = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'ABC Corporation',
        email: 'contact@abc.com',
        phone: '+60123456789',
        registration_no: '202301234567',
        id_type: 'BRN',
        tin_number: '123456789012',
        address_line1: '456 Business Ave',
        city: 'Kuala Lumpur',
        postcode: '50000',
        state_code: '14',
        customer_type: 'B2B',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('ABC Corporation');
    expect(response.body.customer_type).toBe('B2B');
  });

  it('should list customers with tenant isolation', async () => {
    const response = await request(app)
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/integration/customers.test.ts
```

Expected: Test fails (route not implemented)

- [ ] **Step 3: Create customer routes**

```typescript
// backend/src/routes/customers.ts
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const customerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(100).optional(),
  phone: z.string().max(20).optional(),
  registration_no: z.string().min(1).max(50),
  id_type: z.enum(['NRIC', 'PASSPORT', 'BRN', 'ARMY']),
  tin_number: z.string().length(12).optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  postcode: z.string().max(10).optional(),
  state_code: z.string().length(2).optional(),
  country_code: z.string().length(2).default('MY'),
  customer_type: z.enum(['B2B', 'B2C']),
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = customerSchema.parse(req.body);

    // Validate B2B requirements
    if (data.customer_type === 'B2B') {
      if (!data.tin_number) {
        throw new ValidationError('TIN number is required for B2B customers');
      }
      if (!data.address_line1) {
        throw new ValidationError('Address is required for B2B customers');
      }
    }

    const result = await pool.query(
      `INSERT INTO customers (
        tenant_id, name, email, phone, registration_no, id_type, tin_number,
        address_line1, address_line2, city, postcode, state_code, country_code, customer_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        req.tenantId,
        data.name,
        data.email,
        data.phone,
        data.registration_no,
        data.id_type,
        data.tin_number,
        data.address_line1,
        data.address_line2,
        data.city,
        data.postcode,
        data.state_code,
        data.country_code,
        data.customer_type,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let query = `
      SELECT * FROM customers
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `;
    const params: any[] = [req.tenantId];

    if (search) {
      query += ` AND (name ILIKE $2 OR email ILIKE $2)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL',
      [req.tenantId]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = customerSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE customers SET
        name = $1, email = $2, phone = $3, registration_no = $4, id_type = $5,
        tin_number = $6, address_line1 = $7, address_line2 = $8, city = $9,
        postcode = $10, state_code = $11, country_code = $12, customer_type = $13,
        updated_at = NOW()
      WHERE id = $14 AND tenant_id = $15 AND deleted_at IS NULL
      RETURNING *`,
      [
        data.name, data.email, data.phone, data.registration_no, data.id_type,
        data.tin_number, data.address_line1, data.address_line2, data.city,
        data.postcode, data.state_code, data.country_code, data.customer_type,
        req.params.id, req.tenantId,
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 4: Update route aggregator**

```typescript
// backend/src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth';
import customerRoutes from './customers';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);

export default router;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest tests/integration/customers.test.ts
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/customers.ts backend/src/routes/index.ts backend/tests/integration/customers.test.ts
git commit -m "feat: add customer CRUD routes

- Add POST /api/v1/customers (create)
- Add GET /api/v1/customers (list with pagination)
- Add GET /api/v1/customers/:id (get one)
- Add PUT /api/v1/customers/:id (update)
- Add DELETE /api/v1/customers/:id (soft delete)
- Add B2B validation (TIN and address required)
- Add tenant isolation
- Add integration tests"
```

## Task 8: Product CRUD Routes

**Files:**
- Create: `backend/src/routes/products.ts`

- [ ] **Step 1: Create product routes (similar pattern to customers)**

```typescript
// backend/src/routes/products.ts
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  unit_price: z.number().positive(),
  tax_type: z.enum(['SST', 'E', 'Z', 'SR']),
  tax_rate: z.number().min(0).max(100),
  tax_exemption_reason: z.string().max(200).optional(),
}).refine(
  (data) => {
    if (data.tax_rate === 0 && !data.tax_exemption_reason) {
      return false;
    }
    return true;
  },
  { message: 'Tax exemption reason required when tax rate is 0' }
);

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO products (
        tenant_id, name, description, sku, unit_price, tax_type, tax_rate, tax_exemption_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.tenantId,
        data.name,
        data.description,
        data.sku,
        data.unit_price,
        data.tax_type,
        data.tax_rate,
        data.tax_exemption_reason,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM products
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.tenantId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE tenant_id = $1 AND deleted_at IS NULL',
      [req.tenantId]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE products SET
        name = $1, description = $2, sku = $3, unit_price = $4,
        tax_type = $5, tax_rate = $6, tax_exemption_reason = $7, updated_at = NOW()
      WHERE id = $8 AND tenant_id = $9 AND deleted_at IS NULL
      RETURNING *`,
      [
        data.name, data.description, data.sku, data.unit_price,
        data.tax_type, data.tax_rate, data.tax_exemption_reason,
        req.params.id, req.tenantId,
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE products SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 2: Update route aggregator**

```typescript
// backend/src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth';
import customerRoutes from './customers';
import productRoutes from './products';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);

export default router;
```

- [ ] **Step 3: Test product endpoints**

```bash
# Start server
npm run dev

# Test create product
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","unit_price":100,"tax_type":"SST","tax_rate":6}'
```

Expected: Product created successfully

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/products.ts backend/src/routes/index.ts
git commit -m "feat: add product CRUD routes

- Add POST /api/v1/products (create)
- Add GET /api/v1/products (list with pagination)
- Add GET /api/v1/products/:id (get one)
- Add PUT /api/v1/products/:id (update)
- Add DELETE /api/v1/products/:id (soft delete)
- Add tax exemption validation
- Add tenant isolation"
```

## Task 9: Invoice CRUD Routes (Without Submission)

**Files:**
- Create: `backend/src/routes/invoices.ts`

- [ ] **Step 1: Create invoice routes with line items**

```typescript
// backend/src/routes/invoices.ts
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const invoiceItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  tax_type: z.enum(['SST', 'E', 'Z', 'SR']),
  tax_rate: z.number().min(0).max(100),
  tax_exemption_reason: z.string().max(200).optional(),
});

const invoiceSchema = z.object({
  invoice_number: z.string().min(1).max(50),
  invoice_type: z.enum(['01', '02', '03', '04']),
  customer_id: z.string().uuid(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency: z.string().length(3).default('MYR'),
  exchange_rate: z.number().positive().default(1.0),
  payment_method: z.enum(['cash', 'bank_transfer', 'card', 'ewallet']).optional(),
  payment_terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = invoiceSchema.parse(req.body);

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;

    const itemsWithTotals = data.items.map((item) => {
      const line_total = item.quantity * item.unit_price;
      const item_tax = (line_total * item.tax_rate) / 100;
      subtotal += line_total;
      tax_amount += item_tax;

      return {
        ...item,
        tax_amount: item_tax,
        line_total,
      };
    });

    const total_amount = subtotal + tax_amount;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create invoice
      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          tenant_id, invoice_number, invoice_type, customer_id, issue_date, due_date,
          currency, exchange_rate, subtotal, tax_amount, total_amount,
          payment_method, payment_terms, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')
        RETURNING *`,
        [
          req.tenantId,
          data.invoice_number,
          data.invoice_type,
          data.customer_id,
          data.issue_date,
          data.due_date,
          data.currency,
          data.exchange_rate,
          subtotal,
          tax_amount,
          total_amount,
          data.payment_method,
          data.payment_terms,
        ]
      );

      const invoice = invoiceResult.rows[0];

      // Create invoice items
      for (const item of itemsWithTotals) {
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id, product_id, description, quantity, unit_price,
            tax_type, tax_rate, tax_amount, tax_exemption_reason, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            invoice.id,
            item.product_id,
            item.description,
            item.quantity,
            item.unit_price,
            item.tax_type,
            item.tax_rate,
            item.tax_amount,
            item.tax_exemption_reason,
            item.line_total,
          ]
        );
      }

      // Create tax summary
      const taxSummary = new Map<string, { taxable_amount: number; tax_amount: number }>();
      
      for (const item of itemsWithTotals) {
        const key = `${item.tax_type}-${item.tax_rate}`;
        if (!taxSummary.has(key)) {
          taxSummary.set(key, { taxable_amount: 0, tax_amount: 0 });
        }
        const summary = taxSummary.get(key)!;
        summary.taxable_amount += item.line_total;
        summary.tax_amount += item.tax_amount;
      }

      for (const [key, summary] of taxSummary) {
        const [tax_type, tax_rate] = key.split('-');
        await client.query(
          `INSERT INTO invoice_tax_summary (
            invoice_id, tax_type, tax_rate, taxable_amount, tax_amount
          ) VALUES ($1, $2, $3, $4, $5)`,
          [invoice.id, tax_type, parseFloat(tax_rate), summary.taxable_amount, summary.tax_amount]
        );
      }

      await client.query('COMMIT');

      // Fetch complete invoice with items
      const completeInvoice = await pool.query(
        `SELECT i.*, 
          json_agg(ii.*) as items
         FROM invoices i
         LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
         WHERE i.id = $1
         GROUP BY i.id`,
        [invoice.id]
      );

      res.status(201).json(completeInvoice.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = `
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.tenant_id = $1 AND i.deleted_at IS NULL
    `;
    const params: any[] = [req.tenantId];

    if (status) {
      query += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND deleted_at IS NULL',
      [req.tenantId]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.*, 
        json_agg(json_build_object(
          'id', ii.id,
          'product_id', ii.product_id,
          'description', ii.description,
          'quantity', ii.quantity,
          'unit_price', ii.unit_price,
          'tax_type', ii.tax_type,
          'tax_rate', ii.tax_rate,
          'tax_amount', ii.tax_amount,
          'line_total', ii.line_total
        )) as items,
        c.name as customer_name,
        c.email as customer_email
       FROM invoices i
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL
       GROUP BY i.id, c.name, c.email`,
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    // Only allow deleting draft invoices
    const result = await pool.query(
      `UPDATE invoices SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'draft' AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Invoice not found or cannot be deleted');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 2: Update route aggregator**

```typescript
// backend/src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth';
import customerRoutes from './customers';
import productRoutes from './products';
import invoiceRoutes from './invoices';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/invoices', invoiceRoutes);

export default router;
```

- [ ] **Step 3: Test invoice creation**

```bash
curl -X POST http://localhost:3000/api/v1/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_number": "INV-001",
    "invoice_type": "01",
    "customer_id": "CUSTOMER_UUID",
    "issue_date": "2026-05-02",
    "items": [
      {
        "description": "Product 1",
        "quantity": 2,
        "unit_price": 100,
        "tax_type": "SST",
        "tax_rate": 6
      }
    ]
  }'
```

Expected: Invoice created with calculated totals

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/invoices.ts backend/src/routes/index.ts
git commit -m "feat: add invoice CRUD routes

- Add POST /api/v1/invoices (create with items)
- Add GET /api/v1/invoices (list with filters)
- Add GET /api/v1/invoices/:id (get with items)
- Add DELETE /api/v1/invoices/:id (soft delete draft only)
- Add automatic total calculation
- Add tax summary generation
- Add tenant isolation"
```

## Task 10: MyInvois API Client Service

**Files:**
- Create: `backend/src/services/myinvois.ts`

- [ ] **Step 1: Create MyInvois API client**

```typescript
// backend/src/services/myinvois.ts
import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { pool } from '../config/database';
import { encryption } from './encryption';
import { LHDNValidationError, LHDNServerError, NetworkError } from '../utils/errors';
import { logger } from '../utils/logger';

export class MyInvoisClient {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.client = axios.create({
      baseURL: config.MYINVOIS_BASE_URL,
      timeout: 30000,
    });
  }

  async getAccessToken(): Promise<string> {
    // Check if cached token is still valid
    const result = await pool.query(
      `SELECT myinvois_access_token, myinvois_token_expiry, 
              myinvois_client_id, myinvois_client_secret
       FROM tenants WHERE id = $1`,
      [this.tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const tenant = result.rows[0];

    if (!tenant.myinvois_client_id || !tenant.myinvois_client_secret) {
      throw new Error('MyInvois credentials not configured');
    }

    // Check if token is still valid (with 5 min buffer)
    if (tenant.myinvois_access_token && tenant.myinvois_token_expiry) {
      const expiry = new Date(tenant.myinvois_token_expiry);
      const now = new Date();
      const bufferMs = 5 * 60 * 1000; // 5 minutes

      if (expiry.getTime() - now.getTime() > bufferMs) {
        return encryption.decrypt(tenant.myinvois_access_token);
      }
    }

    // Refresh token
    const clientId = encryption.decrypt(tenant.myinvois_client_id);
    const clientSecret = encryption.decrypt(tenant.myinvois_client_secret);

    try {
      const response = await this.client.post('/connect/token', {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      });

      const accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in; // seconds

      // Cache token
      const expiry = new Date(Date.now() + expiresIn * 1000);
      await pool.query(
        `UPDATE tenants 
         SET myinvois_access_token = $1, myinvois_token_expiry = $2
         WHERE id = $3`,
        [encryption.encrypt(accessToken), expiry, this.tenantId]
      );

      logger.info('MyInvois token refreshed', { tenant_id: this.tenantId });

      return accessToken;
    } catch (error: any) {
      logger.error('Failed to get MyInvois token', error);
      throw new NetworkError('Failed to authenticate with MyInvois');
    }
  }

  async submitInvoice(invoicePayload: any): Promise<any> {
    const token = await this.getAccessToken();

    try {
      const response = await this.client.post(
        '/api/v1.0/documents',
        invoicePayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Invoice submitted to MyInvois', {
        tenant_id: this.tenantId,
        submission_uid: response.data.submissionUid,
      });

      return {
        success: true,
        submission_uid: response.data.submissionUid,
        validation_code: response.data.validationCode,
        qr_code: response.data.qrCode,
        digital_signature: response.data.digitalSignature,
      };
    } catch (error: any) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      logger.error('MyInvois submission failed', {
        tenant_id: this.tenantId,
        status,
        error: errorData,
      });

      // Determine if retryable
      const retryable = this.isRetryable(status);

      if (status === 400) {
        throw new LHDNValidationError(
          errorData?.message || 'Invoice validation failed',
          { ...errorData, retryable }
        );
      } else if (status >= 500) {
        throw new LHDNServerError(
          'MyInvois server error',
          { status, retryable }
        );
      } else {
        throw new NetworkError(
          'Failed to submit invoice',
          { status, retryable }
        );
      }
    }
  }

  private isRetryable(status: number): boolean {
    // Retry on server errors, timeouts, network errors
    if (status >= 500) return true;
    if (status === 408) return true; // Request timeout
    if (status === 429) return true; // Rate limit
    if (!status) return true; // Network error
    return false;
  }

  async getDocumentStatus(submissionUid: string): Promise<any> {
    const token = await this.getAccessToken();

    try {
      const response = await this.client.get(
        `/api/v1.0/documents/${submissionUid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get document status', error);
      throw new NetworkError('Failed to get document status from MyInvois');
    }
  }
}

export const buildMyInvoisPayload = async (invoiceId: string, tenantId: string): Promise<any> => {
  // Fetch invoice with all related data
  const result = await pool.query(
    `SELECT 
      i.*,
      json_build_object(
        'name', c.name,
        'email', c.email,
        'tin', c.tin_number,
        'registration_no', c.registration_no,
        'id_type', c.id_type,
        'address_line1', c.address_line1,
        'address_line2', c.address_line2,
        'city', c.city,
        'postcode', c.postcode,
        'state_code', c.state_code,
        'country_code', c.country_code
      ) as customer,
      json_build_object(
        'company_name', t.company_name,
        'tin', t.tin_number,
        'registration_no', t.company_registration_no,
        'msic', t.business_activity_code,
        'sst_registration_no', t.sst_registration_no,
        'address_line1', t.address_line1,
        'address_line2', t.address_line2,
        'city', t.city,
        'postcode', t.postcode,
        'state_code', t.state_code,
        'country_code', t.country_code,
        'email', t.email,
        'phone', t.phone
      ) as supplier,
      json_agg(json_build_object(
        'description', ii.description,
        'quantity', ii.quantity,
        'unit_price', ii.unit_price,
        'tax_type', ii.tax_type,
        'tax_rate', ii.tax_rate,
        'tax_amount', ii.tax_amount,
        'line_total', ii.line_total
      )) as items
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    JOIN tenants t ON t.id = i.tenant_id
    LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE i.id = $1 AND i.tenant_id = $2
    GROUP BY i.id, c.name, c.email, c.tin_number, c.registration_no, c.id_type,
             c.address_line1, c.address_line2, c.city, c.postcode, c.state_code, c.country_code,
             t.company_name, t.tin_number, t.company_registration_no, t.business_activity_code,
             t.sst_registration_no, t.address_line1, t.address_line2, t.city, t.postcode,
             t.state_code, t.country_code, t.email, t.phone`,
    [invoiceId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new Error('Invoice not found');
  }

  const invoice = result.rows[0];

  // Build MyInvois JSON payload
  return {
    _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    Invoice: [{
      ID: [{ _: invoice.invoice_number }],
      IssueDate: [{ _: invoice.issue_date }],
      InvoiceTypeCode: [{ _: invoice.invoice_type, listVersionID: "1.0" }],
      DocumentCurrencyCode: [{ _: invoice.currency }],
      TaxCurrencyCode: [{ _: invoice.currency }],
      AccountingSupplierParty: [{
        Party: [{
          PartyIdentification: [{
            ID: [{ _: invoice.supplier.tin, schemeID: "TIN" }]
          }],
          PostalAddress: [{
            AddressLine: [
              { Line: [{ _: invoice.supplier.address_line1 }] },
              invoice.supplier.address_line2 ? { Line: [{ _: invoice.supplier.address_line2 }] } : null
            ].filter(Boolean),
            CityName: [{ _: invoice.supplier.city }],
            PostalZone: [{ _: invoice.supplier.postcode }],
            CountrySubentityCode: [{ _: invoice.supplier.state_code }],
            Country: [{ IdentificationCode: [{ _: invoice.supplier.country_code }] }]
          }],
          PartyLegalEntity: [{
            RegistrationName: [{ _: invoice.supplier.company_name }],
            CompanyID: [{ _: invoice.supplier.registration_no }]
          }],
          Contact: [{
            ElectronicMail: [{ _: invoice.supplier.email }],
            Telephone: [{ _: invoice.supplier.phone }]
          }],
          IndustryClassificationCode: [{ _: invoice.supplier.msic, name: "Malaysian Standard Industrial Classification" }]
        }]
      }],
      AccountingCustomerParty: [{
        Party: [{
          PartyIdentification: invoice.customer.tin ? [{
            ID: [{ _: invoice.customer.tin, schemeID: "TIN" }]
          }] : [],
          PostalAddress: [{
            AddressLine: [
              { Line: [{ _: invoice.customer.address_line1 || "" }] }
            ],
            CityName: [{ _: invoice.customer.city || "" }],
            PostalZone: [{ _: invoice.customer.postcode || "" }],
            CountrySubentityCode: [{ _: invoice.customer.state_code || "" }],
            Country: [{ IdentificationCode: [{ _: invoice.customer.country_code }] }]
          }],
          PartyLegalEntity: [{
            RegistrationName: [{ _: invoice.customer.name }],
            CompanyID: [{ _: invoice.customer.registration_no, schemeID: invoice.customer.id_type }]
          }],
          Contact: [{
            ElectronicMail: [{ _: invoice.customer.email || "" }]
          }]
        }]
      }],
      LegalMonetaryTotal: [{
        LineExtensionAmount: [{ _: invoice.subtotal.toFixed(2), currencyID: invoice.currency }],
        TaxExclusiveAmount: [{ _: invoice.subtotal.toFixed(2), currencyID: invoice.currency }],
        TaxInclusiveAmount: [{ _: invoice.total_amount.toFixed(2), currencyID: invoice.currency }],
        PayableAmount: [{ _: invoice.total_amount.toFixed(2), currencyID: invoice.currency }]
      }],
      InvoiceLine: invoice.items.map((item: any, index: number) => ({
        ID: [{ _: (index + 1).toString() }],
        InvoicedQuantity: [{ _: item.quantity.toString(), unitCode: "C62" }],
        LineExtensionAmount: [{ _: item.line_total.toFixed(2), currencyID: invoice.currency }],
        Item: [{
          Description: [{ _: item.description }]
        }],
        Price: [{
          PriceAmount: [{ _: item.unit_price.toFixed(4), currencyID: invoice.currency }]
        }],
        TaxTotal: [{
          TaxAmount: [{ _: item.tax_amount.toFixed(2), currencyID: invoice.currency }],
          TaxSubtotal: [{
            TaxableAmount: [{ _: item.line_total.toFixed(2), currencyID: invoice.currency }],
            TaxAmount: [{ _: item.tax_amount.toFixed(2), currencyID: invoice.currency }],
            TaxCategory: [{
              ID: [{ _: item.tax_type }],
              Percent: [{ _: item.tax_rate.toFixed(2) }]
            }]
          }]
        }]
      }))
    }]
  };
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/myinvois.ts
git commit -m "feat: add MyInvois API client service

- Add OAuth2 token management with caching
- Add invoice submission to MyInvois
- Add document status checking
- Add MyInvois payload builder (UBL format)
- Add retry logic determination
- Add error handling for LHDN responses"
```

## Task 11: Background Job Queue & Invoice Submission

**Files:**
- Create: `backend/src/config/queue.ts`
- Create: `backend/src/jobs/submitInvoice.ts`
- Create: `backend/src/worker.ts`

- [ ] **Step 1: Set up Bull queue**

```typescript
// backend/src/config/queue.ts
import Bull from 'bull';

export const invoiceQueue = new Bull('invoice-submission', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 6,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});
```

- [ ] **Step 2: Create invoice submission job**

```typescript
// backend/src/jobs/submitInvoice.ts
import { Job } from 'bull';
import { pool } from '../config/database';
import { MyInvoisClient, buildMyInvoisPayload } from '../services/myinvois';
import { logger } from '../utils/logger';

export async function processInvoiceSubmission(job: Job) {
  const { invoiceId, tenantId } = job.data;

  logger.info('Processing invoice submission', { invoiceId, tenantId, attempt: job.attemptsMade });

  try {
    // Build MyInvois payload
    const payload = await buildMyInvoisPayload(invoiceId, tenantId);

    // Submit to MyInvois
    const client = new MyInvoisClient(tenantId);
    const result = await client.submitInvoice(payload);

    // Update invoice with success
    await pool.query(
      `UPDATE invoices SET
        status = 'submitted',
        lhdn_submission_uid = $1,
        lhdn_validation_code = $2,
        lhdn_qr_code = $3,
        lhdn_digital_signature = $4,
        lhdn_submitted_at = NOW(),
        lhdn_error_message = NULL,
        lhdn_error_code = NULL,
        retry_count = 0,
        next_retry_at = NULL
      WHERE id = $5`,
      [
        result.submission_uid,
        result.validation_code,
        result.qr_code,
        result.digital_signature,
        invoiceId,
      ]
    );

    // Log success
    await pool.query(
      `INSERT INTO submission_logs (
        tenant_id, invoice_id, submission_type, request_payload, response_payload,
        http_status_code, status, retryable
      ) VALUES ($1, $2, 'realtime', $3, $4, 200, 'success', false)`,
      [tenantId, invoiceId, payload, result]
    );

    logger.info('Invoice submitted successfully', { invoiceId, submission_uid: result.submission_uid });

    return { success: true, submission_uid: result.submission_uid };
  } catch (error: any) {
    logger.error('Invoice submission failed', { invoiceId, error: error.message });

    const retryable = error.details?.retryable || false;
    const errorCode = error.code || 'UNKNOWN_ERROR';
    const errorMessage = error.message;

    // Log failure
    await pool.query(
      `INSERT INTO submission_logs (
        tenant_id, invoice_id, submission_type, request_payload, response_payload,
        http_status_code, status, error_code, retryable
      ) VALUES ($1, $2, 'realtime', $3, $4, $5, 'failed', $6, $7)`,
      [
        tenantId,
        invoiceId,
        {},
        error.details || {},
        error.response?.status || 0,
        errorCode,
        retryable,
      ]
    );

    // Update invoice with error
    const retryCount = job.attemptsMade;
    const nextRetryAt = retryable && retryCount < 6
      ? new Date(Date.now() + Math.pow(2, retryCount) * 60000) // Exponential backoff
      : null;

    await pool.query(
      `UPDATE invoices SET
        lhdn_error_message = $1,
        lhdn_error_code = $2,
        retry_count = $3,
        next_retry_at = $4
      WHERE id = $5`,
      [errorMessage, errorCode, retryCount, nextRetryAt, invoiceId]
    );

    if (retryable && retryCount < 6) {
      throw error; // Let Bull retry
    } else {
      // Mark as permanently failed
      await pool.query(
        `UPDATE invoices SET status = 'rejected' WHERE id = $1`,
        [invoiceId]
      );
      logger.error('Invoice submission permanently failed', { invoiceId, retryCount });
    }
  }
}
```

- [ ] **Step 3: Create worker process**

```typescript
// backend/src/worker.ts
import { invoiceQueue } from './config/queue';
import { processInvoiceSubmission } from './jobs/submitInvoice';
import { logger } from './utils/logger';

invoiceQueue.process(5, processInvoiceSubmission);

invoiceQueue.on('completed', (job, result) => {
  logger.info('Job completed', { jobId: job.id, result });
});

invoiceQueue.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job?.id, error: err.message });
});

invoiceQueue.on('error', (error) => {
  logger.error('Queue error', error);
});

logger.info('Worker started, processing invoice submissions');

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker gracefully');
  await invoiceQueue.close();
  process.exit(0);
});
```

- [ ] **Step 4: Add submission endpoint to invoice routes**

```typescript
// Add to backend/src/routes/invoices.ts

router.post('/:id/submit', async (req: AuthRequest, res, next) => {
  try {
    // Validate invoice can be submitted
    const result = await pool.query(
      `SELECT id, status FROM invoices
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    const invoice = result.rows[0];

    if (invoice.status !== 'draft' && invoice.status !== 'validated') {
      throw new ValidationError('Invoice cannot be submitted in current status');
    }

    // Update status to validated
    await pool.query(
      `UPDATE invoices SET status = 'validated' WHERE id = $1`,
      [req.params.id]
    );

    // Queue submission job
    const job = await invoiceQueue.add({
      invoiceId: req.params.id,
      tenantId: req.tenantId,
    });

    logger.info('Invoice submission queued', {
      invoiceId: req.params.id,
      jobId: job.id,
    });

    res.json({
      message: 'Invoice submission queued',
      job_id: job.id,
      status: 'validated',
    });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 5: Add worker start script to package.json**

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "worker": "nodemon --exec ts-node src/worker.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "start:worker": "node dist/worker.js",
    "test": "jest",
    "migrate": "ts-node scripts/migrate.ts"
  }
}
```

- [ ] **Step 6: Test submission flow**

```bash
# Terminal 1: Start API server
npm run dev

# Terminal 2: Start worker
npm run worker

# Terminal 3: Submit invoice
curl -X POST http://localhost:3000/api/v1/invoices/INVOICE_ID/submit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Invoice queued, worker processes it, status updated

- [ ] **Step 7: Commit**

```bash
git add backend/src/config/queue.ts backend/src/jobs backend/src/worker.ts backend/src/routes/invoices.ts backend/package.json
git commit -m "feat: add background job queue and invoice submission

- Add Bull queue for invoice processing
- Add invoice submission job with retry logic
- Add worker process to consume jobs
- Add POST /api/v1/invoices/:id/submit endpoint
- Add exponential backoff retry strategy
- Add submission logging
- Add graceful shutdown handling"
```

---

## Summary & Next Steps

**Completed Core Backend (Tasks 1-11):**
✅ Project initialization
✅ Database schema & migrations
✅ Environment config & utilities
✅ Authentication & JWT middleware
✅ Auth routes (register/login)
✅ Express app setup
✅ Customer CRUD routes
✅ Product CRUD routes
✅ Invoice CRUD routes
✅ MyInvois API client
✅ Background job queue & submission

**Remaining Tasks for Full MVP:**

**Backend (Tasks 12-15):**
- Task 12: PDF generation service
- Task 13: QR code generation service
- Task 14: Tenant management routes
- Task 15: User management routes

**Frontend (Tasks 16-25):**
- Task 16-18: React setup, auth context, login/register pages
- Task 19: Dashboard with analytics
- Task 20-21: Customer & product management UI
- Task 22-24: Invoice list, form, and detail pages
- Task 25: Settings page

**Testing & Deployment (Tasks 26-30):**
- Task 26-28: Integration tests, E2E tests
- Task 29: Performance testing
- Task 30: Deployment preparation

**Current Status:** Core backend functionality complete (11/30 tasks). The system can now:
- Register tenants and users
- Authenticate with JWT
- Manage customers, products, invoices
- Submit invoices to MyInvois with automatic retry
- Process submissions in background workers

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-02-malaysia-einvoice-mvp.md`. 

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**