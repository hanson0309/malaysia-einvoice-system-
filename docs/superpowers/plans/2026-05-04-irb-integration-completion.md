# IRB Integration Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable IRB API integration testing with environment variable credentials while maintaining multi-tenant architecture.

**Architecture:** Add environment variable fallback to existing IRB service and routes. Priority: tenant credentials first, environment variables second. This allows immediate testing without database changes while preserving multi-tenant capability.

**Tech Stack:** TypeScript, Node.js, Express, dotenv

---

## File Structure

**Files to modify:**
1. `backend/.env.example` - Add MyInvois credential documentation
2. `backend/src/config/env.ts` - Add CLIENT_ID and CLIENT_SECRET config
3. `backend/src/services/irbService.ts` - Add getEnvironmentCredentials() method
4. `backend/src/routes/irb.ts` - Add credential fallback logic to 3 endpoints

**No new files created** - this is purely enhancement of existing code.

---

### Task 1: Update Environment Configuration

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/src/config/env.ts:5-14`

- [ ] **Step 1: Update .env.example with MyInvois credentials**

Add to `backend/.env.example`:

```bash
# MyInvois IRB API Configuration
# Get credentials from: https://preprod.myinvois.hasil.gov.my (sandbox) or https://myinvois.hasil.gov.my (production)
# Register your ERP system and use "View and Register ERP" to obtain Client ID and Secret

# Sandbox (Testing) Environment
MYINVOIS_BASE_URL=https://preprod-api.myinvois.hasil.gov.my
MYINVOIS_CLIENT_ID=your_sandbox_client_id_here
MYINVOIS_CLIENT_SECRET=your_sandbox_client_secret_here

# Production Environment (uncomment when ready for production)
# MYINVOIS_BASE_URL=https://api.myinvois.hasil.gov.my
# MYINVOIS_CLIENT_ID=your_production_client_id_here
# MYINVOIS_CLIENT_SECRET=your_production_client_secret_here
```

- [ ] **Step 2: Add CLIENT_ID and CLIENT_SECRET to config object**

In `backend/src/config/env.ts`, update the config object (lines 5-14):

```typescript
export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  MYINVOIS_BASE_URL: process.env.MYINVOIS_BASE_URL || '',
  MYINVOIS_CLIENT_ID: process.env.MYINVOIS_CLIENT_ID || '',
  MYINVOIS_CLIENT_SECRET: process.env.MYINVOIS_CLIENT_SECRET || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
```

- [ ] **Step 3: Verify configuration loads correctly**

Run: `cd backend && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 4: Commit configuration changes**

```bash
git add backend/.env.example backend/src/config/env.ts
git commit -m "feat: add MyInvois client credentials to environment config"
```

---

### Task 2: Add Environment Credential Helper to IRB Service

**Files:**
- Modify: `backend/src/services/irbService.ts:22-28`

- [ ] **Step 1: Import config module**

Add import at the top of `backend/src/services/irbService.ts` (after line 3):

```typescript
import { config } from '../config/env';
```

- [ ] **Step 2: Add getEnvironmentCredentials method**

Add method to IRBService class (after line 28, before getToken method):

```typescript
  /**
   * Get credentials from environment variables
   * Returns null if credentials are not configured
   */
  getEnvironmentCredentials(): { clientId: string; clientSecret: string } | null {
    const clientId = config.MYINVOIS_CLIENT_ID;
    const clientSecret = config.MYINVOIS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    return { clientId, clientSecret };
  }
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd backend && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit IRB service changes**

```bash
git add backend/src/services/irbService.ts
git commit -m "feat: add environment credential helper to IRB service"
```

---

### Task 3: Add Credential Fallback to Submit Endpoint

**Files:**
- Modify: `backend/src/routes/irb.ts:18-101`

- [ ] **Step 1: Extract credential resolution logic**

Replace lines 36-42 in `backend/src/routes/irb.ts` with:

```typescript
    // Get credentials: try tenant first, then environment variables
    let clientId: string;
    let clientSecret: string;

    if (tenant?.myinvois_client_id && tenant?.myinvois_client_secret) {
      // Use tenant-specific credentials
      clientId = tenant.myinvois_client_id;
      clientSecret = irbService.decrypt(
        tenant.myinvois_client_secret,
        tenantId.toString()
      );
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

- [ ] **Step 2: Update getToken call to use resolved credentials**

The existing code at line 50-54 should now use the `clientId` and `clientSecret` variables:

```typescript
    // Get OAuth token
    const accessToken = await irbService.getToken(
      clientId,
      clientSecret
    );
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd backend && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit submit endpoint changes**

```bash
git add backend/src/routes/irb.ts
git commit -m "feat: add credential fallback to IRB submit endpoint"
```

---

### Task 4: Add Credential Fallback to Status Endpoint

**Files:**
- Modify: `backend/src/routes/irb.ts:107-173`

- [ ] **Step 1: Add credential resolution logic to status endpoint**

Replace lines 128-134 in `backend/src/routes/irb.ts` with:

```typescript
    // Get credentials: try tenant first, then environment variables
    let clientId: string;
    let clientSecret: string;

    if (tenant?.myinvois_client_id && tenant?.myinvois_client_secret) {
      // Use tenant-specific credentials
      clientId = tenant.myinvois_client_id;
      clientSecret = irbService.decrypt(
        tenant.myinvois_client_secret,
        tenantId.toString()
      );
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

- [ ] **Step 2: Update getToken call**

The existing code at line 141-144 should now use the resolved credentials:

```typescript
    const accessToken = await irbService.getToken(
      clientId,
      clientSecret
    );
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd backend && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit status endpoint changes**

```bash
git add backend/src/routes/irb.ts
git commit -m "feat: add credential fallback to IRB status endpoint"
```

---

### Task 5: Add Credential Fallback to TIN Lookup Endpoint

**Files:**
- Modify: `backend/src/routes/irb.ts:179-222`

- [ ] **Step 1: Add credential resolution logic to TIN lookup endpoint**

Replace lines 192-197 in `backend/src/routes/irb.ts` with:

```typescript
    // Get credentials: try tenant first, then environment variables
    let clientId: string;
    let clientSecret: string;

    if (tenant?.myinvois_client_id && tenant?.myinvois_client_secret) {
      // Use tenant-specific credentials
      clientId = tenant.myinvois_client_id;
      clientSecret = irbService.decrypt(
        tenant.myinvois_client_secret,
        tenantId.toString()
      );
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

- [ ] **Step 2: Update getToken call**

The existing code at line 204-207 should now use the resolved credentials:

```typescript
    const accessToken = await irbService.getToken(
      clientId,
      clientSecret
    );
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd backend && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit TIN lookup endpoint changes**

```bash
git add backend/src/routes/irb.ts
git commit -m "feat: add credential fallback to IRB TIN lookup endpoint"
```

---

### Task 6: Integration Testing

**Files:**
- Test: All IRB endpoints via API calls

- [ ] **Step 1: Verify environment variables are set**

Check `backend/.env` contains:
```
MYINVOIS_BASE_URL=https://preprod-api.myinvois.hasil.gov.my
MYINVOIS_CLIENT_ID=<actual_sandbox_client_id>
MYINVOIS_CLIENT_SECRET=<actual_sandbox_client_secret>
```

Note: User needs to fill in actual credentials before testing.

- [ ] **Step 2: Start backend server**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3000 without errors

- [ ] **Step 3: Test OAuth token retrieval (manual verification)**

The token is retrieved internally by the endpoints. To verify credentials work, proceed to the next step.

- [ ] **Step 4: Create test invoice via frontend**

1. Open browser to `http://localhost:5173`
2. Login to the system
3. Navigate to Invoices page
4. Create a new draft invoice with valid data
5. Note the invoice ID

- [ ] **Step 5: Test invoice submission to IRB**

1. Open the invoice detail modal
2. Click "Submit to IRB" button
3. Expected: Success message appears
4. Expected: Invoice status changes to "submitted"
5. Expected: `lhdn_submission_uid` is populated

- [ ] **Step 6: Test status check**

1. Click "Refresh Status" button on submitted invoice
2. Expected: Status updates from MyInvois API
3. Expected: Status shows "Valid", "Invalid", or "Submitted"

- [ ] **Step 7: Test error handling with missing credentials**

1. Stop backend server
2. Remove `MYINVOIS_CLIENT_ID` from `.env`
3. Restart server
4. Try to submit invoice
5. Expected: Error message "IRB credentials not configured"
6. Restore credentials in `.env`

- [ ] **Step 8: Document test results**

Create `docs/superpowers/test-results/2026-05-04-irb-integration-testing.md`:

```markdown
# IRB Integration Testing Results

**Date:** 2026-05-04
**Tester:** [Your name]
**Environment:** Sandbox

## Test Results

### OAuth Token Retrieval
- [ ] Pass / [ ] Fail
- Notes:

### Invoice Submission
- [ ] Pass / [ ] Fail
- Invoice ID tested:
- UUID received:
- Notes:

### Status Check
- [ ] Pass / [ ] Fail
- Status received:
- Notes:

### Error Handling
- [ ] Pass / [ ] Fail
- Error message received:
- Notes:

## Issues Found

[List any issues discovered during testing]

## Next Steps

[Any follow-up work needed]
```

- [ ] **Step 9: Commit test documentation**

```bash
git add docs/superpowers/test-results/2026-05-04-irb-integration-testing.md
git commit -m "docs: add IRB integration test results"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Environment configuration (Task 1)
- ✅ IRB service helper method (Task 2)
- ✅ Submit endpoint fallback (Task 3)
- ✅ Status endpoint fallback (Task 4)
- ✅ TIN lookup endpoint fallback (Task 5)
- ✅ Integration testing (Task 6)
- ✅ Documentation updates (.env.example)

**Placeholder Check:**
- ✅ No TBD or TODO items
- ✅ All code blocks are complete
- ✅ All commands have expected outputs
- ✅ Test steps are specific and actionable

**Type Consistency:**
- ✅ `clientId` and `clientSecret` used consistently
- ✅ `getEnvironmentCredentials()` return type matches usage
- ✅ Error messages are consistent across endpoints

**DRY Principle:**
- ⚠️ Credential resolution logic is repeated 3 times (acceptable for this scope - can be refactored later if needed)

**YAGNI Principle:**
- ✅ No unnecessary abstractions
- ✅ No premature optimization
- ✅ Focused on immediate testing needs

---

## Success Criteria

After completing all tasks:

- [ ] Environment variables properly loaded and validated
- [ ] IRB service can retrieve credentials from environment
- [ ] All three IRB endpoints support credential fallback
- [ ] `.env.example` updated with clear documentation
- [ ] Can successfully submit invoice to sandbox (requires user credentials)
- [ ] Can successfully check invoice status (requires user credentials)
- [ ] Error messages are clear and actionable
- [ ] No credentials exposed in logs or responses
