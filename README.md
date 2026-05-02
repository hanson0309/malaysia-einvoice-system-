# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Malaysia E-Invoice System MVP - A multi-tenant SaaS application that automates invoice submission to Malaysia's LHDN (Lembaga Hasil Dalam Negeri) via the MyInvois API. The system handles B2B and B2C invoicing with automatic retry mechanisms for failed submissions.

**Tech Stack:**
- Backend: Node.js + Express + TypeScript + PostgreSQL
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Job Queue: Bull (requires Redis)
- Authentication: JWT with bcrypt

## Architecture

### Multi-Tenancy Model
- Every table includes `tenant_id` for data isolation
- JWT tokens contain `tenant_id` extracted by middleware
- All queries automatically filtered by tenant via `extractTenant` middleware
- Unique constraints are scoped by tenant (e.g., `UNIQUE(tenant_id, invoice_number)`)

### Authentication Flow
1. User registers → creates tenant + admin user in transaction
2. Login returns `access_token` (1h expiry) + `refresh_token` (7d expiry)
3. All protected routes use `authenticateJWT` → `extractTenant` middleware chain
4. Roles: `admin` (full access), `accountant` (CRUD only), `viewer` (read-only)

### Invoice Submission Architecture
```
User submits invoice → POST /api/v1/invoices/:id/submit
  ↓
Status set to 'validated', job queued in Bull
  ↓
Worker process picks up job → calls MyInvoisClient
  ↓
MyInvoisClient: OAuth2 token (cached in DB) → Submit UBL payload
  ↓
Success: status='submitted', save LHDN response (UID, QR, signature)
Failure: log error, schedule retry (exponential backoff: 1m, 5m, 15m, 1h, 6h)
  ↓
After 6 retries: status='rejected', notify admin
```

### Database Schema Key Points
- **Soft deletes**: All tables use `deleted_at` timestamp
- **LHDN tracking**: Invoices table has `lhdn_submission_uid`, `lhdn_validation_code`, `lhdn_qr_code`, `lhdn_error_message`, `retry_count`, `next_retry_at`
- **Audit trail**: `submission_logs` table tracks every API call with request/response
- **Encryption**: `myinvois_client_secret` and `myinvois_access_token` stored encrypted (AES-256)

### MyInvois Integration
- **OAuth2**: Token cached in `tenants.myinvois_access_token` with 5-minute expiry buffer
- **UBL 2.1 Format**: Invoices converted to XML-like JSON structure required by LHDN
- **Retry Logic**: Only retry on network errors (5xx, timeout, connection refused), NOT validation errors (400)
- **Tax Types**: SST (standard), E (exempt), Z (zero-rated), SR (standard-rated)

## Development Commands

### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials and generate secrets:
# JWT_SECRET: openssl rand -base64 32
# ENCRYPTION_KEY: openssl rand -hex 16

# Run migrations (creates all 11 tables)
npm run migrate

# Start development server (with hot reload)
npm run dev

# Start background worker (in separate terminal)
npm run worker

# Run tests
npm test

# Build for production
npm run build
npm start
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Database Requirements
- PostgreSQL 14+
- Redis (for Bull queue)
- Create database: `createdb einvoice`

## Code Organization

### Backend Structure
```
backend/src/
├── config/          # Database pool, env validation, Bull queue
├── middleware/      # auth (JWT), tenant (isolation), errorHandler
├── routes/          # Express routes (auth, customers, products, invoices)
├── services/        # myinvois (API client), encryption (AES-256)
├── jobs/            # submitInvoice (Bull job processor)
├── utils/           # logger (JSON), errors (custom classes)
├── types/           # TypeScript interfaces for all entities
├── app.ts           # Express app setup
├── server.ts        # HTTP server entry point
└── worker.ts        # Background job worker

migrations/          # SQL files (001-011) for schema
scripts/             # migrate.ts (migration runner)
tests/
├── unit/            # JWT tests
└── integration/     # API endpoint tests
```

### Key Files to Understand

**backend/src/services/myinvois.ts** (789 lines)
- Most complex file in the codebase
- Handles OAuth2, UBL payload building, submission, retry logic
- `buildMyInvoisPayload()` converts invoice → UBL 2.1 format (nested JSON structure)

**backend/src/routes/invoices.ts**
- Most complex CRUD route
- Creates invoice + items + tax summary in single transaction
- Automatic calculation of subtotal, tax_amount, total_amount
- POST /:id/submit queues background job

**backend/src/jobs/submitInvoice.ts**
- Processes invoice submission jobs
- Updates invoice status based on MyInvois response
- Implements exponential backoff retry logic

## Important Patterns

### Error Handling
- All middleware wrapped in try-catch, calls `next(error)`
- Custom error classes extend `AppError` with statusCode and code
- Global `errorHandler` middleware returns structured JSON responses
- Never throw errors synchronously in Express middleware

### Validation
- Use Zod schemas for all request validation
- B2B customers require `tin_number` and `address_line1`
- Products with `tax_rate = 0` require `tax_exemption_reason`
- Invoice items automatically calculate `tax_amount` and `line_total`

### Database Transactions
- Use `pool.connect()` → `BEGIN` → `COMMIT`/`ROLLBACK` → `client.release()` in finally block
- Always release client in finally block to prevent connection leaks
- Used in: register (tenant + user), invoice creation (invoice + items + tax summary)

### Security
- Passwords hashed with bcrypt (12 rounds)
- Sensitive data encrypted with AES-256-CBC using `crypto.scryptSync` for key derivation
- JWT secrets validated on startup (throws if missing)
- All routes require authentication except `/auth/register`, `/auth/login`, `/health`

## Testing Notes

- Integration tests require database connection (use test database)
- Tests use supertest to call API endpoints
- Auth tests use `done` callback for async setTimeout tests
- Tests NOT run during development (no .env in test environment yet)

## Common Gotchas

1. **Worker must run separately**: API server doesn't process jobs, worker does
2. **Redis required**: Bull queue needs Redis running on localhost:6379
3. **Token caching**: MyInvois tokens cached in DB, check expiry before using
4. **Tenant isolation**: ALWAYS filter by `tenant_id` in queries
5. **Soft deletes**: Check `deleted_at IS NULL` in all SELECT queries
6. **Invoice status flow**: draft → validated → submitted/rejected (cannot submit if not draft/validated)
7. **Retry logic**: Only retryable errors get scheduled for retry, validation errors don't

## Environment Variables

Required for startup (app will throw if missing):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Access token signing key
- `JWT_REFRESH_SECRET` - Refresh token signing key
- `ENCRYPTION_KEY` - Must be 32 characters for AES-256

Optional:
- `NODE_ENV` - development/production
- `PORT` - API server port (default: 3000)
- `MYINVOIS_BASE_URL` - LHDN API endpoint
- `FRONTEND_URL` - CORS origin (default: http://localhost:5173)
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
