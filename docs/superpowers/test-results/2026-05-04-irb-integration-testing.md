# IRB Integration Testing Results

**Date:** 2026-05-04
**Tester:** [Your name]
**Environment:** Sandbox

## Prerequisites

Before testing, ensure the following are configured in `backend/.env`:

```
MYINVOIS_BASE_URL=https://preprod-api.myinvois.hasil.gov.my
MYINVOIS_CLIENT_ID=<actual_sandbox_client_id>
MYINVOIS_CLIENT_SECRET=<actual_sandbox_client_secret>
```

**Note:** You must obtain actual sandbox credentials from https://preprod.myinvois.hasil.gov.my by registering your ERP system.

---

## Test Results

### OAuth Token Retrieval
- [ ] Pass / [ ] Fail
- **Notes:**
  - Token is retrieved internally by the endpoints
  - Verify by checking that invoice submission succeeds (indicates token was obtained)
  - Check backend logs for any authentication errors

### Invoice Submission
- [ ] Pass / [ ] Fail
- **Invoice ID tested:**
- **UUID received:**
- **Notes:**
  - Create a draft invoice via frontend
  - Click "Submit to IRB" button
  - Expected: Success message appears
  - Expected: Invoice status changes to "submitted"
  - Expected: `lhdn_submission_uid` is populated

### Status Check
- [ ] Pass / [ ] Fail
- **Status received:**
- **Notes:**
  - Click "Refresh Status" button on submitted invoice
  - Expected: Status updates from MyInvois API
  - Expected: Status shows "Valid", "Invalid", or "Submitted"

### Error Handling
- [ ] Pass / [ ] Fail
- **Error message received:**
- **Notes:**
  - Test with missing credentials:
    1. Stop backend server
    2. Remove `MYINVOIS_CLIENT_ID` from `.env`
    3. Restart server
    4. Try to submit invoice
  - Expected: Error message "IRB credentials not configured. Please add credentials to tenant or environment variables."
  - Restore credentials after test

---

## Issues Found

[List any issues discovered during testing]

---

## Next Steps

[Any follow-up work needed]

---

## Testing Instructions

### Step 1: Start Backend and Frontend Servers

Backend:
```bash
cd backend
npm run dev
```
Expected: Server starts on port 3000 without errors

Frontend:
```bash
cd frontend
npm run dev
```
Expected: Frontend starts on port 5173 without errors

### Step 2: Create Test Invoice
1. Open browser to `http://localhost:5173`
2. Login to the system
3. Navigate to Invoices page
4. Create a new draft invoice with valid data
5. Note the invoice ID

### Step 3: Test Invoice Submission
1. Open the invoice detail modal
2. Click "Submit to IRB" button
3. Verify success message and status change

### Step 4: Test Status Check
1. Click "Refresh Status" button on submitted invoice
2. Verify status updates correctly

### Step 5: Test Error Handling

Test A - Missing CLIENT_ID:
1. Stop backend server
2. Remove `MYINVOIS_CLIENT_ID` from `.env`
3. Restart backend server
4. Try to submit invoice
5. Expected: Error message "IRB credentials not configured"
6. Restore `MYINVOIS_CLIENT_ID` in `.env`

Test B - Missing CLIENT_SECRET:
1. Stop backend server
2. Remove `MYINVOIS_CLIENT_SECRET` from `.env`
3. Restart backend server
4. Try to submit invoice
5. Expected: Error message "IRB credentials not configured"
6. Restore `MYINVOIS_CLIENT_SECRET` in `.env`
7. Restart backend server
