# Urgent Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 urgent issues to make the system production-ready: add toast notifications, fix SendingHistoryPanel layout, and implement rate limiting.

**Architecture:** Independent fixes in sequence - toast system first (infrastructure), then layout fix (uses toast), then rate limiting (backend protection). Each fix is independently testable and reversible.

**Tech Stack:** react-hot-toast, express-rate-limit, React, TypeScript, Express

---

## File Structure

**Files to create:**
- `backend/src/middleware/rateLimiter.ts` - Rate limiting middleware for send endpoint

**Files to modify:**
- `frontend/package.json` - Add react-hot-toast dependency
- `frontend/src/App.tsx` - Add Toaster component
- `frontend/src/components/SendInvoiceModal.tsx` - Replace alert(), add invoiceId prop, embed SendingHistoryPanel, handle 429 errors
- `frontend/src/pages/InvoiceDetailPage.tsx` - Replace alert() calls, remove standalone SendingHistoryPanel, pass invoiceId to modal
- `backend/package.json` - Add express-rate-limit dependency
- `backend/src/routes/invoices.ts` - Apply rate limiter to send endpoint

---

### Task 1: Install and Configure Toast System

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Install react-hot-toast**

Run: `cd frontend && npm install react-hot-toast`
Expected: Package installed successfully

- [ ] **Step 2: Add Toaster component to App.tsx**

Add import at top of file (after existing imports):

```typescript
import { Toaster } from 'react-hot-toast';
```

Add Toaster component inside the Router, after all Routes (around line 50):

```typescript
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '0.75rem',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#f1f5f9',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#f1f5f9',
              },
            },
          }}
        />
      </Router>
```

- [ ] **Step 3: Verify dev server runs**

Run: `cd frontend && npm run dev`
Expected: Server starts without errors, Toaster component renders (no visual change yet)

- [ ] **Step 4: Commit toast setup**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/App.tsx
git commit -m "feat: add react-hot-toast notification system"
```

---

### Task 2: Replace alert() in SendInvoiceModal

**Files:**
- Modify: `frontend/src/components/SendInvoiceModal.tsx:90`

- [ ] **Step 1: Add toast import**

Add to imports at top of file:

```typescript
import toast from 'react-hot-toast';
```

- [ ] **Step 2: Replace alert() with toast.success()**

Replace line 90:

```typescript
// Before:
alert('Invoice sent successfully!');

// After:
toast.success('Invoice sent successfully!');
```

- [ ] **Step 3: Test toast notification**

Run: `cd frontend && npm run dev`
Navigate to invoice detail page, click Send, send an invoice.
Expected: Green toast notification appears in top-right corner instead of alert dialog

- [ ] **Step 4: Commit SendInvoiceModal toast**

```bash
git add frontend/src/components/SendInvoiceModal.tsx
git commit -m "refactor: replace alert with toast in SendInvoiceModal"
```

---

### Task 3: Replace alert() in InvoiceDetailPage

**Files:**
- Modify: `frontend/src/pages/InvoiceDetailPage.tsx:56,61-67,81-84,88`

- [ ] **Step 1: Add toast import**

Add to imports at top of file:

```typescript
import toast from 'react-hot-toast';
```

- [ ] **Step 2: Replace IRB submission success alert (line 56)**

```typescript
// Before:
alert('发票已成功提交到 IRB！');

// After:
toast.success('发票已成功提交到 IRB！');
```

- [ ] **Step 3: Replace IRB submission error alerts (lines 61-67)**

```typescript
// Before:
if (errorMsg.includes('credentials not configured')) {
  alert('IRB 凭证未配置，请联系系统管理员配置 MyInvois Client ID 和 Secret。');
} else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
  alert('网络连接失败，请稍后重试');
} else {
  alert(`提交失败：${errorMsg}`);
}

// After:
if (errorMsg.includes('credentials not configured')) {
  toast.error('IRB 凭证未配置，请联系系统管理员配置 MyInvois Client ID 和 Secret。');
} else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
  toast.error('网络连接失败，请稍后重试');
} else {
  toast.error(`提交失败：${errorMsg}`);
}
```

- [ ] **Step 4: Replace status refresh alerts (lines 81-84)**

```typescript
// Before:
if (newStatus !== currentStatus) {
  alert(`状态已更新为：${newStatus}`);
} else {
  alert(`状态无变化，仍为：${currentStatus}`);
}

// After:
if (newStatus !== currentStatus) {
  toast.success(`状态已更新为：${newStatus}`);
} else {
  toast.info(`状态无变化，仍为：${currentStatus}`);
}
```

- [ ] **Step 5: Replace status error alert (line 88)**

```typescript
// Before:
alert('无法获取最新状态，请稍后重试');

// After:
toast.error('无法获取最新状态，请稍后重试');
```

- [ ] **Step 6: Test all toast notifications**

Run: `cd frontend && npm run dev`
Test scenarios:
1. Submit invoice to IRB → should show success toast
2. Trigger IRB error → should show error toast
3. Refresh status → should show info/success toast
4. Trigger status error → should show error toast

Expected: All toasts appear correctly, no alert() dialogs

- [ ] **Step 7: Commit InvoiceDetailPage toast replacements**

```bash
git add frontend/src/pages/InvoiceDetailPage.tsx
git commit -m "refactor: replace all alert calls with toast in InvoiceDetailPage"
```

---

### Task 4: Move SendingHistoryPanel into SendInvoiceModal

**Files:**
- Modify: `frontend/src/components/SendInvoiceModal.tsx:7-21,383`
- Modify: `frontend/src/pages/InvoiceDetailPage.tsx:366-370`

- [ ] **Step 1: Add invoiceId prop to SendInvoiceModal interface**

Update the interface (lines 7-21):

```typescript
interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    _id: string;
    invoice_number: string;
    total_amount: number;
  };
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  onSuccess: () => void;
  invoiceId: string; // Add this line
}
```

Update the component parameters (line 23):

```typescript
export default function SendInvoiceModal({
  isOpen,
  onClose,
  invoice,
  customer,
  onSuccess,
  invoiceId, // Add this line
}: SendInvoiceModalProps) {
```

- [ ] **Step 2: Import SendingHistoryPanel**

Add to imports at top of file:

```typescript
import SendingHistoryPanel from './SendingHistoryPanel';
```

- [ ] **Step 3: Add SendingHistoryPanel before closing motion.div**

After the Send button closing tag (after line 382), before the closing `</motion.div>` (line 384), insert:

```typescript
              {/* Sending History */}
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <SendingHistoryPanel invoiceId={invoiceId} />
              </div>
```

- [ ] **Step 4: Update InvoiceDetailPage to pass invoiceId**

In `InvoiceDetailPage.tsx`, update the SendInvoiceModal component (around line 355):

```typescript
<SendInvoiceModal
  isOpen={isSendModalOpen}
  onClose={() => setIsSendModalOpen(false)}
  invoice={{
    _id: invoice._id,
    invoice_number: invoice.invoice_number,
    total_amount: invoice.total_amount,
  }}
  customer={invoice.customer}
  onSuccess={() => {
    setSendingHistoryKey(prev => prev + 1);
    setIsSendModalOpen(false);
  }}
  invoiceId={invoice._id} // Add this line
/>
```

- [ ] **Step 5: Remove standalone SendingHistoryPanel from InvoiceDetailPage**

Delete lines 366-370:

```typescript
// DELETE THESE LINES:
{/* Sending History */}
{invoice && (
  <div style={{ marginTop: '2rem' }}>
    <SendingHistoryPanel key={sendingHistoryKey} invoiceId={invoice._id} />
  </div>
)}
```

- [ ] **Step 6: Test SendingHistoryPanel in modal**

Run: `cd frontend && npm run dev`
Test scenarios:
1. Open invoice detail page
2. Click Send button → modal opens
3. Scroll down in modal → should see Sending History section
4. Send invoice → history should refresh automatically
5. Close modal → history should not appear on page

Expected: SendingHistoryPanel appears inside modal, refreshes after send, no standalone panel on page

- [ ] **Step 7: Commit SendingHistoryPanel layout fix**

```bash
git add frontend/src/components/SendInvoiceModal.tsx frontend/src/pages/InvoiceDetailPage.tsx
git commit -m "fix: move SendingHistoryPanel inside SendInvoiceModal"
```

---

### Task 5: Install Rate Limiting Library

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install express-rate-limit**

Run: `cd backend && npm install express-rate-limit`
Expected: Package installed successfully

- [ ] **Step 2: Verify backend still runs**

Run: `cd backend && npm run dev`
Expected: Server starts without errors

- [ ] **Step 3: Commit rate limit dependency**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add express-rate-limit dependency"
```

---

### Task 6: Create Rate Limiter Middleware

**Files:**
- Create: `backend/src/middleware/rateLimiter.ts`

- [ ] **Step 1: Create rateLimiter.ts file**

Create new file `backend/src/middleware/rateLimiter.ts`:

```typescript
import rateLimit from 'express-rate-limit';
import { AuthRequest } from './auth';

export const sendInvoiceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window per user
  message: 'Too many send requests. Please try again in a minute.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Rate limit by user ID from JWT token
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.user_id || req.ip;
  },
  
  // Custom error handler
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many send requests. Please try again in a minute.',
      retryAfter: 60,
    });
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd backend && npm run build`
Expected: Build succeeds without errors

- [ ] **Step 3: Commit rate limiter middleware**

```bash
git add backend/src/middleware/rateLimiter.ts
git commit -m "feat: add rate limiter middleware for send endpoint"
```

---

### Task 7: Apply Rate Limiter to Send Endpoint

**Files:**
- Modify: `backend/src/routes/invoices.ts:307`

- [ ] **Step 1: Import rate limiter**

Add to imports at top of file:

```typescript
import { sendInvoiceRateLimiter } from '../middleware/rateLimiter';
```

- [ ] **Step 2: Apply middleware to send endpoint**

Update the route definition (line 307):

```typescript
// Before:
router.post('/:id/send', async (req: AuthRequest, res, next) => {

// After:
router.post('/:id/send', sendInvoiceRateLimiter, async (req: AuthRequest, res, next) => {
```

- [ ] **Step 3: Test rate limiting**

Run: `cd backend && npm run dev`

Test with curl or Postman:
1. Send 5 requests rapidly → all should succeed (200)
2. Send 6th request → should get 429 error
3. Wait 1 minute → should work again

Expected: Rate limiting works correctly

- [ ] **Step 4: Commit rate limiter application**

```bash
git add backend/src/routes/invoices.ts
git commit -m "feat: apply rate limiting to invoice send endpoint"
```

---

### Task 8: Handle 429 Errors in Frontend

**Files:**
- Modify: `frontend/src/components/SendInvoiceModal.tsx:100-107`

- [ ] **Step 1: Update error handling in handleSend**

Update the catch block (around lines 100-107):

```typescript
} catch (err: unknown) {
  const errorResponse = err && typeof err === 'object' && 'response' in err
    ? (err as { response?: { data?: { error?: string; retryAfter?: number }; status?: number } }).response
    : undefined;
  
  // Handle rate limiting
  if (errorResponse?.status === 429) {
    const retryAfter = errorResponse.data?.retryAfter || 60;
    toast.error(`Too many requests. Please try again in ${retryAfter} seconds.`);
    return;
  }
  
  // Handle other errors
  const errorMessage = errorResponse?.data?.error || 'Failed to send invoice';
  toast.error(errorMessage);
} finally {
```

- [ ] **Step 2: Test 429 error handling**

Run: `cd frontend && npm run dev`

Test scenario:
1. Send 5 invoices rapidly → should succeed
2. Send 6th invoice → should show rate limit toast error
3. Verify error message is user-friendly

Expected: Rate limit errors display as toast notifications

- [ ] **Step 3: Commit 429 error handling**

```bash
git add frontend/src/components/SendInvoiceModal.tsx
git commit -m "feat: handle rate limit errors with toast notifications"
```

---

### Task 9: Final Testing and Verification

**Files:**
- Test: All modified files

- [ ] **Step 1: Run backend build**

Run: `cd backend && npm run build`
Expected: Build succeeds without errors

- [ ] **Step 2: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds without errors

- [ ] **Step 3: Start both servers**

Terminal 1: `cd backend && npm run dev`
Terminal 2: `cd frontend && npm run dev`
Expected: Both servers running without errors

- [ ] **Step 4: Test toast notifications**

1. Navigate to invoice detail page
2. Click Send → verify success toast appears
3. Try IRB submission → verify success/error toasts
4. Refresh status → verify info toast
Expected: All toasts work correctly, no alert() dialogs

- [ ] **Step 5: Test SendingHistoryPanel layout**

1. Open invoice detail page
2. Click Send button
3. Scroll down in modal → verify history panel appears
4. Send invoice → verify history refreshes
5. Close modal → verify no standalone panel on page
Expected: History panel integrated in modal

- [ ] **Step 6: Test rate limiting**

1. Send 5 invoices rapidly → all succeed
2. Send 6th invoice → rate limit error toast appears
3. Wait 1 minute → can send again
Expected: Rate limiting works, friendly error messages

- [ ] **Step 7: Check git status**

Run: `git status`
Expected: Working tree clean (all changes committed)

- [ ] **Step 8: Review commit history**

Run: `git log --oneline -10`
Expected: See all 8 commits from this implementation

---

## Implementation Complete

All 3 urgent fixes completed:
- ✅ Toast notification system (no more alert() calls)
- ✅ SendingHistoryPanel inside modal (better UX)
- ✅ Rate limiting on send endpoint (5/min/user)

System is now production-ready with professional UX and abuse protection.
