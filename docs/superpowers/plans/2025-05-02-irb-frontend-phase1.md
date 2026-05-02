# IRB Frontend Integration - Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate IRB MyInvois API into the invoice detail page, enabling users to submit invoices to IRB and view submission status.

**Architecture:** Update API layer with new IRB endpoints, then enhance InvoiceDetailPage with IRB information display, submit functionality, and status refresh capability. Use existing component state management and alert-based notifications.

**Tech Stack:** React, TypeScript, Axios, Tailwind CSS, Lucide Icons

---

## File Structure

**Files to modify:**
1. `src/lib/api.ts` - Add IRB API namespace with 3 endpoints
2. `src/pages/InvoiceDetailPage.tsx` - Add IRB UI components and logic

**No new files needed** - all changes are enhancements to existing files.

---

## Task 1: Add IRB API Endpoints

**Files:**
- Modify: `src/lib/api.ts:75` (after invoiceApi definition)

- [ ] **Step 1: Add IRB API namespace**

Add this code after the `invoiceApi` definition (around line 75):

```typescript
// IRB API
export const irbApi = {
  submitInvoice: (id: string) => api.post(`/irb/submit/${id}`),
  getStatus: (id: string) => api.get(`/irb/status/${id}`),
  lookupTin: (nric: string) => api.post('/irb/tin-lookup', { nric }),
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit API layer changes**

```bash
git add src/lib/api.ts
git commit -m "feat: add IRB API endpoints for submit, status, and TIN lookup"
```

---

## Task 2: Add IRB Status Badge Component

**Files:**
- Modify: `src/pages/InvoiceDetailPage.tsx:1-10` (imports)
- Modify: `src/pages/InvoiceDetailPage.tsx:55-108` (render section)

- [ ] **Step 1: Add RefreshCw icon import**

Update the lucide-react import at the top of the file:

```typescript
import { ArrowLeft, Send, RefreshCw } from 'lucide-react';
```

- [ ] **Step 2: Add irbApi import**

Add after the existing api import:

```typescript
import { invoiceApi, irbApi } from '../lib/api';
```

- [ ] **Step 3: Add refreshing state**

Add this state variable after the existing useState declarations (around line 10):

```typescript
const [isRefreshing, setIsRefreshing] = useState(false);
```

- [ ] **Step 4: Create getIRBStatusColor helper function**

Add this function before the return statement (around line 53):

```typescript
const getIRBStatusColor = (status: string) => {
  switch (status) {
    case 'submitted':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'accepted':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 6: Commit status badge helper**

```bash
git add src/pages/InvoiceDetailPage.tsx
git commit -m "feat: add IRB status badge color helper function"
```

---

## Task 3: Implement Submit to IRB Functionality

**Files:**
- Modify: `src/pages/InvoiceDetailPage.tsx:27-37` (replace handleSubmit)
- Modify: `src/pages/InvoiceDetailPage.tsx:66-74` (update button)

- [ ] **Step 1: Replace handleSubmit function**

Replace the existing `handleSubmit` function (lines 27-37) with this enhanced version:

```typescript
const handleSubmit = async () => {
  if (!confirm('确认提交此发票到 MyInvois IRB？\n提交后将无法撤销。')) return;

  try {
    const response = await irbApi.submitInvoice(id!);
    alert('发票已成功提交到 IRB！');
    loadInvoice();
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || '提交失败';
    
    if (errorMsg.includes('credentials not configured')) {
      alert('IRB 凭证未配置，请联系系统管理员配置 MyInvois Client ID 和 Secret。');
    } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
      alert('网络连接失败，请稍后重试');
    } else {
      alert(`提交失败：${errorMsg}`);
    }
  }
};
```

- [ ] **Step 2: Update submit button condition**

Replace the button condition (line 66) to check for IRB submission:

```typescript
{invoice.status === 'draft' && !invoice.lhdn_submission_uid && (
```

- [ ] **Step 3: Update button text**

Change button text to reflect IRB submission:

```typescript
<button
  onClick={handleSubmit}
  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
>
  <Send className="w-4 h-4 mr-2" />
  Submit to IRB
</button>
```

- [ ] **Step 4: Test submit functionality manually**

Start dev server: `npm run dev`
Navigate to an invoice detail page
Click "Submit to IRB" button
Expected: Confirmation dialog appears

- [ ] **Step 5: Commit submit functionality**

```bash
git add src/pages/InvoiceDetailPage.tsx
git commit -m "feat: implement submit to IRB with error handling"
```

---

## Task 4: Implement Refresh IRB Status Functionality

**Files:**
- Modify: `src/pages/InvoiceDetailPage.tsx:38-52` (add handleRefreshStatus)

- [ ] **Step 1: Add handleRefreshStatus function**

Add this function after the `handleSubmit` function:

```typescript
const handleRefreshStatus = async () => {
  if (!invoice?.lhdn_submission_uid) return;
  
  setIsRefreshing(true);
  try {
    const response = await irbApi.getStatus(id!);
    const newStatus = response.data.status;
    const currentStatus = invoice.status;
    
    if (newStatus !== currentStatus) {
      alert(`状态已更新为：${newStatus}`);
    } else {
      alert(`状态无变化，仍为：${currentStatus}`);
    }
    
    await loadInvoice();
  } catch (error: any) {
    alert('无法获取最新状态，请稍后重试');
  } finally {
    setIsRefreshing(false);
  }
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit refresh functionality**

```bash
git add src/pages/InvoiceDetailPage.tsx
git commit -m "feat: add IRB status refresh functionality"
```

---

## Task 5: Add IRB Information Display Section

**Files:**
- Modify: `src/pages/InvoiceDetailPage.tsx:108-135` (add IRB section after header)

- [ ] **Step 1: Add IRB information section**

Add this section after the invoice header (after line 108, before the customer/items grid):

```typescript
{/* IRB Information Section */}
{invoice.lhdn_submission_uid && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">IRB MyInvois Information</h2>
      {invoice.status === 'submitted' && (
        <button
          onClick={handleRefreshStatus}
          disabled={isRefreshing}
          className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '刷新中...' : '刷新状态'}
        </button>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-gray-600 mb-1">Status</p>
        <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full border ${getIRBStatusColor(invoice.status)}`}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-1">UUID</p>
        <p className="text-sm font-mono text-gray-900 break-all">{invoice.lhdn_submission_uid}</p>
      </div>

      {invoice.lhdn_submitted_at && (
        <div>
          <p className="text-sm text-gray-600 mb-1">Submitted At</p>
          <p className="text-sm text-gray-900">
            {new Date(invoice.lhdn_submitted_at).toLocaleString('en-MY', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}

      {invoice.lhdn_validation_code && (
        <div>
          <p className="text-sm text-gray-600 mb-1">Validation Code</p>
          <p className="text-sm font-mono text-gray-900">{invoice.lhdn_validation_code}</p>
        </div>
      )}
    </div>

    {invoice.lhdn_qr_code && (
      <div className="mt-4 pt-4 border-t border-blue-200">
        <p className="text-sm text-gray-600 mb-2">QR Code</p>
        <img 
          src={invoice.lhdn_qr_code} 
          alt="IRB QR Code" 
          className="w-32 h-32 border border-gray-300 rounded"
        />
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2: Test IRB section display**

Start dev server: `npm run dev`
Navigate to an invoice with IRB data
Expected: IRB information section displays with all fields

- [ ] **Step 3: Test refresh button**

Click "刷新状态" button on a submitted invoice
Expected: Button shows loading state, then alert with status

- [ ] **Step 4: Commit IRB display section**

```bash
git add src/pages/InvoiceDetailPage.tsx
git commit -m "feat: add IRB information display section with QR code support"
```

---

## Task 6: Update Invoice Type Definitions

**Files:**
- Modify: `src/pages/InvoiceDetailPage.tsx:9` (invoice type)

- [ ] **Step 1: Add IRB fields to invoice type**

Update the invoice state type to include IRB fields. Add this interface near the top of the file (after imports):

```typescript
interface InvoiceData {
  _id: string;
  invoice_number: string;
  status: string;
  lhdn_submission_uid?: string;
  lhdn_submitted_at?: string;
  lhdn_validation_code?: string;
  lhdn_qr_code?: string;
  lhdn_digital_signature?: string;
  customer: any;
  items: any[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  issue_date: string;
  due_date?: string;
}
```

- [ ] **Step 2: Update invoice state type**

Change the invoice state declaration:

```typescript
const [invoice, setInvoice] = useState<InvoiceData | null>(null);
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Commit type definitions**

```bash
git add src/pages/InvoiceDetailPage.tsx
git commit -m "feat: add TypeScript types for IRB invoice fields"
```

---

## Task 7: Fix Field Name Mapping

**Files:**
- Modify: `src/pages/InvoiceDetailPage.tsx:82,114-117,125-132` (field references)

- [ ] **Step 1: Update invoice number reference**

Change line 82 from:

```typescript
<p className="text-lg text-gray-600 mt-1">#{invoice.invoiceNumber}</p>
```

To:

```typescript
<p className="text-lg text-gray-600 mt-1">#{invoice.invoice_number}</p>
```

- [ ] **Step 2: Update customer field references**

Change customer field references (lines 114-117) from camelCase to snake_case:

```typescript
<p className="font-medium">{invoice.customer.name}</p>
<p className="text-sm">{invoice.customer.email}</p>
{invoice.customer.phone && <p className="text-sm">{invoice.customer.phone}</p>}
{invoice.customer.address && <p className="text-sm mt-1">{invoice.customer.address}</p>}
```

To:

```typescript
<p className="font-medium">{invoice.customer.name}</p>
<p className="text-sm">{invoice.customer.email}</p>
{invoice.customer.phone && <p className="text-sm">{invoice.customer.phone}</p>}
{invoice.customer.address_line1 && <p className="text-sm mt-1">{invoice.customer.address_line1}</p>}
```

- [ ] **Step 3: Update date field references**

Change date field references (lines 125-132) from camelCase to snake_case:

```typescript
<span className="text-gray-900">{new Date(invoice.issue_date).toLocaleDateString()}</span>
```

And:

```typescript
{invoice.due_date && (
  <p className="text-sm">
    <span className="text-gray-500">Due Date:</span>{' '}
    <span className="text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</span>
  </p>
)}
```

- [ ] **Step 4: Update item field references**

Change item field references in the table (lines 151-155) from camelCase to snake_case:

```typescript
<td className="px-4 py-4 text-sm text-gray-900">{item.description}</td>
<td className="px-4 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
<td className="px-4 py-4 text-sm text-gray-900 text-right">RM {item.unit_price.toFixed(2)}</td>
<td className="px-4 py-4 text-sm text-gray-900 text-right">{item.tax_rate}%</td>
<td className="px-4 py-4 text-sm text-gray-900 text-right">RM {item.line_total.toFixed(2)}</td>
```

- [ ] **Step 5: Update total field references**

Change total field references (lines 166-174) from camelCase to snake_case:

```typescript
<span className="font-medium">RM {invoice.subtotal.toFixed(2)}</span>
```

```typescript
<span className="font-medium">RM {invoice.tax_amount.toFixed(2)}</span>
```

```typescript
<span>RM {invoice.total_amount.toFixed(2)}</span>
```

- [ ] **Step 6: Verify TypeScript compilation**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 7: Test page rendering**

Start dev server: `npm run dev`
Navigate to invoice detail page
Expected: All fields display correctly with no console errors

- [ ] **Step 8: Commit field name fixes**

```bash
git add src/pages/InvoiceDetailPage.tsx
git commit -m "fix: update field names to match backend snake_case convention"
```

---

## Task 8: Manual Testing

**Files:**
- Test: `src/pages/InvoiceDetailPage.tsx` (full page functionality)

- [ ] **Step 1: Test submit flow - success case**

1. Start dev server: `npm run dev`
2. Navigate to invoice detail page for a draft invoice
3. Click "Submit to IRB" button
4. Confirm in dialog
5. Expected: Success alert, page reloads, IRB section appears

- [ ] **Step 2: Test submit flow - error case**

1. Submit an invoice when backend credentials are not configured
2. Expected: Friendly error message about credentials

- [ ] **Step 3: Test IRB information display**

1. Navigate to an invoice that has been submitted to IRB
2. Expected: IRB section displays with UUID, status, submitted time
3. If validation code exists, it should display
4. If QR code exists, it should display as image

- [ ] **Step 4: Test refresh status - submitted invoice**

1. Navigate to invoice with status "submitted"
2. Click "刷新状态" button
3. Expected: Button shows loading animation, then alert with status result

- [ ] **Step 5: Test refresh status - final state invoice**

1. Navigate to invoice with status "accepted" or "rejected"
2. Expected: Refresh button does not appear

- [ ] **Step 6: Test responsive layout**

1. Resize browser window to mobile size
2. Expected: IRB section remains readable, grid collapses to single column

- [ ] **Step 7: Document test results**

Create a test results file:

```bash
cat > test-results-phase1.md << 'EOF'
# Phase 1 Manual Test Results

Date: $(date +%Y-%m-%d)

## Submit to IRB
- [ ] Success case works
- [ ] Error handling works
- [ ] Confirmation dialog appears

## IRB Information Display
- [ ] UUID displays correctly
- [ ] Status badge shows correct color
- [ ] Submitted time formats correctly
- [ ] Validation code displays when present
- [ ] QR code displays when present

## Refresh Status
- [ ] Button appears for submitted invoices
- [ ] Button hidden for final state invoices
- [ ] Loading animation works
- [ ] Status updates correctly

## Edge Cases
- [ ] Network timeout handled gracefully
- [ ] Missing credentials error is friendly
- [ ] Page works on mobile viewport

## Notes
[Add any observations or issues here]
EOF
```

- [ ] **Step 8: Commit test results**

```bash
git add test-results-phase1.md
git commit -m "test: add Phase 1 manual test results"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Submit invoice to IRB (Task 3)
- ✅ Display IRB information (Task 5)
- ✅ Refresh IRB status (Task 4)
- ✅ Error handling (Task 3)
- ✅ QR code display (Task 5)
- ✅ Status badge colors (Task 2)

**Placeholder scan:**
- ✅ No TBD or TODO items
- ✅ All code blocks are complete
- ✅ All error messages are specified

**Type consistency:**
- ✅ Field names match backend (snake_case)
- ✅ API endpoints match backend routes
- ✅ Function names are consistent across tasks

**No gaps found** - all Phase 1 requirements are covered.

---

## Completion Criteria

Phase 1 is complete when:
- ✅ All 8 tasks are checked off
- ✅ `npm run build` succeeds with no errors
- ✅ Manual testing checklist is complete
- ✅ All commits are pushed to repository
- ✅ Invoice detail page displays IRB information correctly
- ✅ Submit and refresh functionality work as expected

---

## Next Steps

After Phase 1 completion:
1. Deploy to staging environment
2. Test with real IRB sandbox API
3. Collect user feedback
4. Plan Phase 2 implementation (Toast notifications, dual status badges, TIN lookup)
