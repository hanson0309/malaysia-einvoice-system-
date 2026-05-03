---
name: IRB Integration Completion
description: Complete MyInvois IRB API integration with environment variable fallback and testing setup
type: design
date: 2026-05-04
---

# IRB Integration Completion - Design Specification

## Overview

Complete the MyInvois IRB (Inland Revenue Board) API integration by adding environment variable configuration support, enabling immediate testing while maintaining multi-tenant capability for future use.

## Background

The project already has:
- ✅ IRB routes registered at `/api/v1/irb` (in `routes/index.ts`)
- ✅ IRB service implementation with OAuth, document submission, and status checking
- ✅ Frontend invoice modal with IRB action buttons
- ⚠️ Routes expect tenant-level credentials from database, but no fallback mechanism
- ⚠️ Environment variables incomplete (missing CLIENT_ID and CLIENT_SECRET)

## Goals

1. Enable immediate testing with sandbox credentials via environment variables
2. Maintain multi-tenant architecture for future tenant-specific credentials
3. Update configuration files and documentation
4. Verify integration works end-to-end

## Non-Goals

- Building admin UI for tenant credential management (future work)
- Implementing production deployment (future work)
- Adding batch submission features (future work)

## MyInvois Environment Details

### Sandbox (Testing)
- Portal: `https://preprod.myinvois.hasil.gov.my`
- API Base URL: `https://preprod-api.myinvois.hasil.gov.my`
- Requires separate registration and credentials

### Production
- Portal: `https://myinvois.hasil.gov.my`
- API Base URL: `https://api.myinvois.hasil.gov.my`

### Authentication
- OAuth 2.0 client credentials flow
- Endpoint: `POST /connect/token`
- Token validity: 60 minutes
- Rate limit: 12 requests per minute per client ID

## Architecture

### Credential Resolution Strategy

**Priority order:**
1. **Tenant-level credentials** (from database) - highest priority
2. **Environment variables** (from `.env`) - fallback

**Why:** This allows immediate testing with shared credentials while keeping the door open for multi-tenant deployments where each company uses their own IRB credentials.

### Component Changes

#### 1. Environment Configuration (`backend/src/config/env.ts`)

Add new environment variables:
- `MYINVOIS_CLIENT_ID` - OAuth client ID
- `MYINVOIS_CLIENT_SECRET` - OAuth client secret

These join the existing `MYINVOIS_BASE_URL`.

#### 2. IRB Service (`backend/src/services/irbService.ts`)

**Current behavior:** Only accepts credentials as method parameters.

**New behavior:** Add helper method to get credentials from environment variables when tenant credentials are not available.

**Method signature:**
```typescript
getEnvironmentCredentials(): { clientId: string; clientSecret: string } | null
```

Returns `null` if environment variables are not set, allowing calling code to handle the missing credentials case.

#### 3. IRB Routes (`backend/src/routes/irb.ts`)

**Current behavior:** 
- Fetches tenant from database
- Requires `tenant.myinvois_client_id` and `tenant.myinvois_client_secret`
- Returns 400 error if missing

**New behavior:**
- Try to get credentials from tenant first
- If tenant credentials missing, fall back to environment variables
- Only return 400 error if both sources are unavailable

**Affected endpoints:**
- `POST /api/v1/irb/submit/:invoiceId`
- `GET /api/v1/irb/status/:invoiceId`
- `POST /api/v1/irb/tin-lookup`

#### 4. Environment Example File (`backend/.env.example`)

Add documentation for the new variables with clear comments explaining:
- Sandbox vs production URLs
- How to obtain credentials
- When to use environment vs tenant-level credentials

## Data Flow

### Invoice Submission Flow

```
Frontend → POST /api/v1/irb/submit/:invoiceId
    ↓
IRB Route Handler
    ↓
1. Authenticate user (JWT)
2. Extract tenant context
3. Fetch invoice from database
4. Get credentials:
   - Try tenant.myinvois_client_id/secret
   - If missing → try environment variables
   - If both missing → return 400 error
5. Get OAuth token from MyInvois
6. Build IRB document (UBL 2.1 format)
7. Submit to MyInvois API
8. Update invoice status in database
9. Return response to frontend
```

### Credential Resolution Logic

```typescript
let clientId: string;
let clientSecret: string;

if (tenant?.myinvois_client_id && tenant?.myinvois_client_secret) {
  // Use tenant-specific credentials
  clientId = tenant.myinvois_client_id;
  clientSecret = irbService.decrypt(tenant.myinvois_client_secret, tenantId);
} else {
  // Fall back to environment variables
  const envCreds = irbService.getEnvironmentCredentials();
  if (!envCreds) {
    return res.status(400).json({
      error: 'IRB credentials not configured. Please add credentials to tenant or environment variables.'
    });
  }
  clientId = envCreds.clientId;
  clientSecret = envCreds.clientSecret;
}
```

## Error Handling

### Missing Credentials
- **Status:** 400 Bad Request
- **Message:** "IRB credentials not configured. Please add credentials to tenant or environment variables."
- **When:** Both tenant and environment credentials are missing

### Invalid Credentials
- **Status:** 401 Unauthorized (from MyInvois API)
- **Message:** Pass through MyInvois error message
- **When:** Credentials are invalid or expired

### Rate Limit Exceeded
- **Status:** 429 Too Many Requests (from MyInvois API)
- **Message:** "Rate limit exceeded. Please try again later."
- **When:** More than 12 requests per minute

## Testing Strategy

### Manual Testing Steps

1. **Environment Setup**
   - Add sandbox credentials to `.env`
   - Restart backend server
   - Verify credentials loaded via health check or logs

2. **OAuth Token Test**
   - Use Postman or curl to call login endpoint
   - Verify token received with 60-minute expiry
   - Verify token can be reused

3. **Invoice Submission Test**
   - Create a draft invoice via frontend
   - Click "Submit to IRB" button
   - Verify invoice status changes to "submitted"
   - Verify `lhdn_submission_uid` is populated

4. **Status Check Test**
   - Click "Refresh Status" on submitted invoice
   - Verify status updates from MyInvois
   - Check for "Valid" or "Invalid" status

5. **Error Cases**
   - Test with missing credentials (should return 400)
   - Test with invalid invoice ID (should return 404)
   - Test with non-existent invoice (should return 404)

### Frontend Testing

Open browser and test the invoice modal:
- Draft invoice should show "Submit to IRB" button
- Submitted invoice should show "Refresh Status" button
- Success/error messages should display clearly
- Loading states should show during API calls

## Security Considerations

### Credential Storage

**Environment variables:**
- Stored in `.env` file (not committed to git)
- Loaded at server startup
- Accessible only to backend process

**Tenant credentials:**
- Stored encrypted in MongoDB
- Decrypted using `ENCRYPTION_KEY` + tenant ID
- Only accessible to authenticated users of that tenant

### API Security

- All IRB routes require JWT authentication
- Tenant isolation enforced via middleware
- HTTPS required for all MyInvois API calls
- Credentials never exposed in API responses or logs

## Migration Path

### Current State → Testing (This Implementation)
- Add environment variables
- Update IRB service and routes
- Test with sandbox credentials

### Testing → Multi-Tenant Production (Future)
- Build admin UI for tenant credential management
- Add API endpoints for credential CRUD
- Migrate from environment to tenant-specific credentials
- Remove environment variable fallback (optional)

## Files to Modify

1. `backend/.env` - Add CLIENT_ID and CLIENT_SECRET (already done)
2. `backend/.env.example` - Document new variables
3. `backend/src/config/env.ts` - Add new config fields
4. `backend/src/services/irbService.ts` - Add environment credential helper
5. `backend/src/routes/irb.ts` - Add fallback logic to all three endpoints

## Success Criteria

- [ ] Environment variables properly loaded and validated
- [ ] IRB service can retrieve credentials from environment
- [ ] All three IRB endpoints support credential fallback
- [ ] `.env.example` updated with clear documentation
- [ ] Can successfully submit invoice to sandbox
- [ ] Can successfully check invoice status
- [ ] Error messages are clear and actionable
- [ ] No credentials exposed in logs or responses

## Future Enhancements

1. **Admin UI for Tenant Credentials**
   - Form to input CLIENT_ID and CLIENT_SECRET
   - Encrypt before storing in database
   - Test connection button

2. **Credential Validation**
   - Test credentials before saving
   - Show credential status (valid/invalid/expired)
   - Automatic token refresh

3. **Monitoring and Logging**
   - Track submission success/failure rates
   - Monitor API response times
   - Alert on rate limit approaching

4. **Batch Operations**
   - Submit multiple invoices at once
   - Respect rate limits (12/minute)
   - Progress tracking UI

## References

- MyInvois SDK Documentation: https://sdk.myinvois.hasil.gov.my/
- OAuth 2.0 Client Credentials: https://sdk.myinvois.hasil.gov.my/api/07-login-as-taxpayer-system/
- Environment URLs: https://sdk.myinvois.hasil.gov.my/faq/
