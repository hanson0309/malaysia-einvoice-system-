# IRB Frontend Integration Design

**Date:** 2025-05-02  
**Author:** Claude (with user approval)  
**Status:** Approved

## Overview

This document describes the frontend implementation for integrating Malaysia's IRB (Inland Revenue Board) MyInvois API into the existing e-invoice system. The backend IRB API integration is already complete with three endpoints: submit invoice, check status, and TIN lookup.

## Goals

1. Enable users to submit invoices to IRB from the invoice detail page
2. Display comprehensive IRB submission information (UUID, status, QR code, validation code)
3. Allow users to manually refresh IRB status
4. Provide clear error messages when submission fails
5. Integrate TIN lookup into customer forms (Phase 2)
6. Show dual status badges in invoice list (Phase 2)

## Implementation Approach

**Phased rollout (渐进式实现):**

- **Phase 1 (Priority):** Core IRB functionality in invoice detail page
- **Phase 2 (Enhancement):** List page improvements, Toast notifications, TIN lookup

This approach allows us to:
- Quickly validate IRB integration
- Reduce risk by testing core functionality first
- Adjust Phase 2 based on Phase 1 feedback
- Deliver value incrementally

## Phase 1: Core IRB Functionality

### 1. API Layer Updates

**File:** `src/lib/api.ts`

Add new IRB API namespace:

```typescript
// IRB API
export const irbApi = {
  submitInvoice: (id: string) => api.post(`/irb/submit/${id}`),
  getStatus: (id: string) => api.get(`/irb/status/${id}`),
  lookupTin: (nric: string) => api.post('/irb/tin-lookup', { nric }),
};
```

**Design rationale:**
- Separate namespace from existing `invoiceApi` for clear separation of concerns
- Matches backend API routes exactly
- Easy to extend with additional IRB endpoints

### 2. Invoice Detail Page Updates

**File:** `src/pages/InvoiceDetailPage.tsx`

#### 2.1 IRB Information Display

Add new section between invoice header and customer/items section:

**Layout:**
```
┌─────────────────────────────────────────┐
│ Invoice Header (existing)                │
├─────────────────────────────────────────┤
│ IRB Information Section (new)            │
│ ┌─────────────────────────────────────┐ │
│ │ 📋 Status: [Badge] [Refresh Button] │ │
│ │ 🔑 UUID: dca08a1b-...               │ │
│ │ 📅 Submitted: 2025-05-02 14:30     │ │
│ │ ✅ Validation Code: ABC123         │ │
│ │ [QR Code Image if available]       │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Customer & Items (existing)              │
└─────────────────────────────────────────┘
```

**Display logic:**
- Show IRB section only if `lhdn_submission_uid` exists
- Show "Submit to IRB" button if not yet submitted
- Display QR code only if `lhdn_qr_code` field has data

**Status badge colors:**
- `submitted` → Blue (processing)
- `accepted` → Green (success)
- `rejected` → Red (failed)
- `cancelled` → Gray (cancelled)

**Data fields to display:**
- UUID (`lhdn_submission_uid`)
- Submission time (`lhdn_submitted_at`)
- Status (`status`)
- Validation code (`lhdn_validation_code`)
- QR code (`lhdn_qr_code`) - rendered as image

#### 2.2 Submit to IRB Flow

**Button behavior:**

1. **Before click:** Show confirmation dialog
   ```
   "确认提交此发票到 MyInvois IRB？
    提交后将无法撤销。"
   [取消] [确认提交]
   ```

2. **During submission:** Button shows loading state
   ```
   [⏳ 提交中...] (disabled)
   ```

3. **On success:**
   - Show alert: "发票已成功提交到 IRB！"
   - Reload invoice data
   - Button disappears, IRB info section appears

4. **On failure:**
   - Show friendly error message via alert
   - Button returns to enabled state
   - Error message varies by error type

**Error handling strategy:**

```typescript
try {
  await irbApi.submitInvoice(id);
  alert('发票已成功提交到 IRB！');
  loadInvoice();
} catch (error: any) {
  const errorMsg = error.response?.data?.error || '提交失败';
  
  if (errorMsg.includes('credentials not configured')) {
    alert('IRB 凭证未配置，请联系系统管理员配置 MyInvois Client ID 和 Secret。');
  } else {
    alert(`提交失败：${errorMsg}`);
  }
}
```

**Error types and messages:**
- Credentials not configured → "IRB 凭证未配置，请联系系统管理员"
- Network error → "网络连接失败，请稍后重试"
- Validation error → Display backend error message
- Unknown error → "提交失败，请稍后重试"

#### 2.3 Refresh IRB Status

**Button design:**
- Location: Top-right of IRB info section, next to status badge
- Icon: 🔄 (refresh icon)
- Label: "刷新状态"

**Visibility:**
- Only show when status is `submitted` (the only changeable state)
- Hide when status is `accepted` or `rejected` (final states)

**Refresh behavior:**

1. **On click:**
   - Button shows loading animation
   - Call `GET /api/v1/irb/status/:id`
   - Update local invoice data

2. **On success:**
   - If status changed → alert "状态已更新为：{newStatus}"
   - If status unchanged → alert "状态无变化，仍为：{currentStatus}"
   - Refresh page display

3. **On failure:**
   - Alert "无法获取最新状态，请稍后重试"

**Implementation:**

```typescript
const handleRefreshStatus = async () => {
  setRefreshing(true);
  try {
    const response = await irbApi.getStatus(id);
    const newStatus = response.data.status;
    
    if (newStatus !== invoice.status) {
      alert(`状态已更新为：${newStatus}`);
    } else {
      alert('状态无变化');
    }
    
    loadInvoice();
  } catch (error) {
    alert('无法获取最新状态，请稍后重试');
  } finally {
    setRefreshing(false);
  }
};
```

### 3. Data Model Alignment

**Backend field names (from Invoice model):**
- `lhdn_submission_uid` - IRB UUID
- `lhdn_submitted_at` - Submission timestamp
- `lhdn_validation_code` - Validation code
- `lhdn_qr_code` - QR code data
- `lhdn_digital_signature` - Digital signature
- `status` - Invoice status (includes IRB states)

**Frontend must use these exact field names** when accessing invoice data.

### 4. Phase 1 Deliverables

**Files to modify:**
1. `src/lib/api.ts` - Add IRB API endpoints
2. `src/pages/InvoiceDetailPage.tsx` - Add IRB UI and logic

**Features delivered:**
- ✅ Submit invoice to IRB
- ✅ Display complete IRB information
- ✅ Refresh IRB status manually
- ✅ Friendly error handling
- ✅ QR code display (if available)

**Estimated effort:** 2-3 hours

## Phase 2: Enhanced Experience

### 1. Invoice List Page - Dual Status Badges

**File:** `src/pages/InvoicesPage.tsx`

Add second status badge showing IRB status alongside business status:

```
Invoice #001  |  [Draft] [IRB: Submitted]  |  RM 1,234.56
Invoice #002  |  [Paid] [IRB: Accepted]    |  RM 2,345.67
```

**Display logic:**
- First badge: Business status (draft/paid/cancelled)
- Second badge: IRB status (only if submitted to IRB)
- If not submitted to IRB, show only business status

### 2. Toast Notification System

**New component:** `src/components/Toast.tsx`

Replace alert() calls with elegant toast notifications:

**Features:**
- Auto-dismiss after 3-5 seconds
- Success (green), Error (red), Info (blue) variants
- Stack multiple toasts
- Dismiss button

**Usage:**
```typescript
toast.success('发票已成功提交到 IRB！');
toast.error('提交失败：凭证未配置');
```

### 3. Customer Form - TIN Lookup

**File:** `src/pages/CustomerFormPage.tsx`

Add TIN lookup button next to NRIC field:

```
NRIC: [____________] [查询 TIN]
TIN:  [____________] (auto-filled)
```

**Behavior:**
1. User enters NRIC
2. Clicks "查询 TIN"
3. Call `POST /api/v1/irb/tin-lookup`
4. Auto-fill TIN field with result
5. Show toast on success/failure

**Error handling:**
- NRIC not found → Use default TIN "EI00000000010"
- Network error → Show error toast
- Invalid NRIC format → Show validation error

### 4. Phase 2 Deliverables

**Files to modify:**
1. `src/pages/InvoicesPage.tsx` - Dual status badges
2. `src/components/Toast.tsx` - New toast component
3. `src/pages/InvoiceDetailPage.tsx` - Replace alerts with toasts
4. `src/pages/CustomerFormPage.tsx` - TIN lookup

**Features delivered:**
- ✅ Dual status display in invoice list
- ✅ Toast notification system
- ✅ TIN lookup in customer form
- ✅ Improved error UX

**Estimated effort:** 3-4 hours

## Technical Considerations

### Error Handling

**Principle:** Fail gracefully with clear user guidance

**Error categories:**
1. **Configuration errors** - Guide user to contact admin
2. **Validation errors** - Show specific field issues
3. **Network errors** - Suggest retry
4. **Unknown errors** - Log details, show generic message

### State Management

**Current approach:** Component-level state with useState

**For Phase 1:** Continue with component state (simple, sufficient)

**For Phase 2:** Consider if global state needed for toast system

### API Response Handling

**Backend response format (submit):**
```json
{
  "success": true,
  "uuid": "dca08a1b-...",
  "message": "Invoice submitted successfully"
}
```

**Backend response format (status):**
```json
{
  "status": "accepted",
  "uuid": "dca08a1b-...",
  "details": { ... }
}
```

**Frontend must handle:**
- Success responses
- Error responses with `error` field
- Network failures (no response)

### Security Considerations

**Client Secret:** Never exposed to frontend (handled by backend)

**Authentication:** All IRB API calls require JWT token (already implemented)

**Data validation:** Trust backend validation, show errors to user

## Testing Strategy

### Phase 1 Testing

**Manual testing checklist:**
1. Submit invoice with valid credentials → Success
2. Submit invoice without credentials → Friendly error
3. Refresh status when submitted → Updates correctly
4. Refresh status when accepted → No change
5. Display QR code when available
6. Display all IRB fields correctly

**Edge cases:**
- Network timeout during submission
- Invalid invoice data
- Backend API down
- Missing IRB credentials

### Phase 2 Testing

**Additional tests:**
1. Dual status badges display correctly
2. Toast notifications appear and dismiss
3. TIN lookup with valid NRIC
4. TIN lookup with invalid NRIC
5. Multiple toasts stack properly

## Deployment Plan

### Phase 1 Deployment

1. Deploy backend IRB API (already done)
2. Deploy frontend Phase 1 changes
3. Test with sandbox IRB environment
4. Monitor for errors
5. Collect user feedback

### Phase 2 Deployment

1. Complete Phase 1 testing
2. Implement Phase 2 features
3. Test integrated experience
4. Deploy Phase 2
5. Monitor and iterate

## Success Criteria

### Phase 1 Success

- ✅ Users can submit invoices to IRB
- ✅ IRB information displays correctly
- ✅ Status refresh works reliably
- ✅ Error messages are clear and actionable
- ✅ No critical bugs in production

### Phase 2 Success

- ✅ Invoice list clearly shows IRB status
- ✅ Toast notifications improve UX
- ✅ TIN lookup saves time for users
- ✅ Overall workflow feels polished

## Future Enhancements

**Not in current scope, but possible later:**

1. **Auto-refresh status** - Poll for status changes automatically
2. **Batch submission** - Submit multiple invoices at once
3. **Settings page** - Let users configure IRB credentials
4. **PDF download** - Download IRB-validated invoice PDF
5. **Email notifications** - Notify when status changes
6. **Audit log** - Track all IRB submissions and status changes

## Appendix

### Backend API Endpoints

```
POST   /api/v1/irb/submit/:invoiceId    - Submit invoice to IRB
GET    /api/v1/irb/status/:invoiceId    - Get IRB status
POST   /api/v1/irb/tin-lookup            - Lookup TIN by NRIC
```

### Database Fields

**Tenant model:**
- `myinvois_client_id` - IRB Client ID
- `myinvois_client_secret` - Encrypted Client Secret

**Invoice model:**
- `lhdn_submission_uid` - IRB UUID
- `lhdn_submitted_at` - Submission timestamp
- `lhdn_validation_code` - Validation code
- `lhdn_qr_code` - QR code data
- `lhdn_digital_signature` - Digital signature
- `status` - Invoice status

### References

- Backend integration docs: `backend/IRB_INTEGRATION.md`
- Backend fix summary: `backend/FIX_SUMMARY.md`
- IRB MyInvois API: https://sdk.myinvois.hasil.gov.my/
