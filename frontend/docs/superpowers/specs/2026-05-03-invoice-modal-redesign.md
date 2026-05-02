# Invoice Detail Modal Redesign

**Date:** 2026-05-03  
**Status:** Approved  
**Type:** UI Component Redesign

## Overview

Redesign the invoice detail view as a modal overlay that appears on the invoices list page, replacing the current full-page navigation approach. The modal should display invoice information in a receipt-sized format that's clear, professional, and doesn't completely obscure the background.

## Problem Statement

Currently, clicking the "View" (eye icon) button on an invoice navigates to a separate full-page view (`/dashboard/invoices/:id`). This breaks the user's context and makes it harder to quickly review multiple invoices. The existing modal implementation has layout issues with incorrect z-index stacking and positioning.

## Goals

1. Keep users on the invoices list page when viewing invoice details
2. Display invoice information in a compact, receipt-sized format
3. Maintain all existing functionality (view details, submit to IRB, refresh status)
4. Provide smooth animations and clear visual hierarchy
5. Allow easy dismissal (click background, X button, or Back button)

## Design

### Component Architecture

**InvoiceDetailModal Component**
- Location: `src/components/InvoiceDetailModal.tsx`
- Props:
  - `invoiceId: string` - ID of the invoice to display
  - `onClose: () => void` - Callback when modal is closed
  - `onUpdate: () => void` - Callback to refresh the invoices list after changes
- State:
  - `invoice: InvoiceData | null` - Loaded invoice data
  - `isLoading: boolean` - Loading state
  - `isRefreshing: boolean` - Status refresh in progress

**Integration with InvoicesPage**
- Add state: `selectedInvoiceId: string | null`
- Change Eye button from `<Link>` to `<button>` that sets `selectedInvoiceId`
- Render `<InvoiceDetailModal>` conditionally when `selectedInvoiceId` is set
- Wrap in `<AnimatePresence>` for exit animations

### Visual Hierarchy (Z-Index Layers)

```
Layer 1 (z-50): Background overlay - semi-transparent, clickable to close
Layer 2 (z-[60]): Fixed UI elements - X button (top-left), System Online badge (top-right)
Layer 3 (z-[60]): Modal card - white receipt card, centered
```

### Layout Structure

**Background Overlay**
- `fixed inset-0` - covers entire viewport
- `bg-black/60` - 60% opacity black
- `backdrop-blur-sm` - subtle blur effect
- Click handler calls `onClose()`

**Fixed Elements (outside card)**
- X Close Button:
  - Position: `top-6 left-6`
  - Size: `w-10 h-10`
  - Icon: white/light gray, hover to white
  - Click handler calls `onClose()`
  
- System Online Badge:
  - Position: `top-6 right-6`
  - Style: emerald border and text, semi-transparent background
  - Text: "System Online"

**Modal Card (centered)**
- Container: `fixed inset-0 flex items-center justify-center p-6`
- Card dimensions:
  - Width: `max-w-2xl` (672px)
  - Max height: `calc(100vh - 8rem)` (leaves 4rem top + 4rem bottom margin)
- Background: `bg-white`
- Border radius: `rounded-xl` (12px)
- Shadow: `shadow-2xl`
- Overflow: `overflow-hidden` on card, `overflow-y-auto` on content area

**Card Internal Structure**

1. **Header Bar** (`bg-slate-50 border-b`)
   - Left: Back to Invoices button (arrow icon + text)
   - Right: Submit to IRB button (if status is draft)
   - Padding: `px-6 py-3`
   - Font size: `text-xs`

2. **Scrollable Content Area** (`px-6 py-6`)
   - Invoice title and number
   - Status badge
   - Bill To information (left) | Issue/Due dates (right)
   - Line items table
   - Totals (right-aligned)
   - IRB information section (if submitted)

### Content Layout

**Invoice Header**
- Title: "Invoice" - `text-3xl font-bold`
- Invoice number: `#INV-2026-001` - `text-base text-indigo-600`
- Status badge: right-aligned, `text-xs` in gray rounded box

**Bill To & Dates** (2-column grid)
- Left column: Bill To section
  - Label: "BILL TO:" - `text-xs uppercase`
  - Customer name - `text-sm font-semibold`
  - Email, phone, address - `text-xs text-slate-600`
- Right column: Dates (right-aligned)
  - Issue Date: `text-xs`
  - Due Date: `text-xs`

**Line Items Table**
- Font size: `text-xs`
- Columns: Description | Qty | Unit Price | Tax | Amount
- Headers: uppercase, bold, `text-slate-500`
- Rows: alternating with subtle borders
- Alignment: Description (left), Qty (center), Unit Price (right), Tax (center), Amount (right)

**Totals Section**
- Width: `w-64` (right-aligned)
- Font size: `text-sm`
- Rows: Subtotal, Tax, Total
- Total row: larger font (`text-lg`), bold, top border

**IRB Information** (if exists)
- Border top separator
- Grid layout for UUID, Submitted At, Validation Code
- QR code display if available
- Refresh button for submitted status

### Animations

**Modal Entry**
- Backdrop: fade in (`opacity: 0 → 1`)
- Card: scale up + slide up (`scale: 0.9, y: 20 → scale: 1, y: 0`)
- Duration: 300ms
- Easing: `easeOut`

**Modal Exit**
- Backdrop: fade out
- Card: scale down + slide down
- Duration: 300ms

### Interaction Behaviors

**Close Actions**
- Click background overlay → close
- Click X button (top-left) → close
- Click "Back to Invoices" → close
- ESC key → (not implemented, but could be added)

**Submit to IRB**
- Show confirmation dialog
- On success: reload invoice data, call `onUpdate()` to refresh list
- On error: show error message with specific handling for credentials/network issues

**Refresh Status**
- Only shown for submitted invoices
- Disable button during refresh (show spinner)
- Compare old vs new status, show alert if changed
- Reload invoice data, call `onUpdate()`

## Technical Details

**Dependencies**
- `framer-motion` - for animations
- `lucide-react` - for icons
- `react-router-dom` - for navigation (removed from Eye button)
- Existing API utilities: `invoiceApi`, `irbApi`

**TypeScript Interfaces**
```typescript
interface InvoiceData {
  _id: string;
  invoice_number: string;
  status: string;
  lhdn_submission_uid?: string;
  lhdn_submitted_at?: string;
  lhdn_validation_code?: string;
  lhdn_qr_code?: string;
  customer: any;
  items: any[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  issue_date: string;
  due_date?: string;
}

interface InvoiceDetailModalProps {
  invoiceId: string;
  onClose: () => void;
  onUpdate: () => void;
}
```

**Styling Approach**
- Tailwind CSS utility classes
- Responsive: works on desktop (primary target)
- Color palette:
  - Background overlay: `black/60`
  - Card: `white`
  - Text: `slate-900` (primary), `slate-600` (secondary), `slate-500` (labels)
  - Accent: `indigo-600` (invoice number), `emerald-500` (submit button, online badge)
  - Borders: `slate-200`

## Files to Modify

1. **Create:** `src/components/InvoiceDetailModal.tsx`
   - New modal component with all invoice display logic

2. **Modify:** `src/pages/InvoicesPage.tsx`
   - Add `selectedInvoiceId` state
   - Change Eye button from Link to button with onClick
   - Add `<InvoiceDetailModal>` with `<AnimatePresence>`

3. **Keep:** `src/pages/InvoiceDetailPage.tsx`
   - Keep for now (in case direct URL access is needed)
   - Can be removed later if not needed

## Success Criteria

- [ ] Clicking eye icon opens modal on current page (no navigation)
- [ ] Modal displays all invoice information clearly
- [ ] Modal is properly sized (receipt-like, not full screen)
- [ ] Background is semi-transparent, shows invoices list behind
- [ ] All close actions work (background click, X button, Back button)
- [ ] Submit to IRB functionality works from modal
- [ ] Refresh status functionality works from modal
- [ ] Smooth animations on open/close
- [ ] No z-index or positioning issues
- [ ] Invoice list updates after submit/refresh actions

## Future Enhancements (Out of Scope)

- ESC key to close
- Keyboard navigation (arrow keys to view next/previous invoice)
- Print functionality
- Download as PDF
- Mobile responsive design
- Accessibility improvements (focus trap, ARIA labels)
