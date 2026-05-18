# Urgent Fixes Design Specification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 urgent issues to make the system production-ready: add toast notifications, fix SendingHistoryPanel layout, and implement rate limiting.

**Architecture:** Independent fixes in sequence - toast system first (infrastructure), then layout fix (uses toast), then rate limiting (backend protection).

**Tech Stack:** react-hot-toast, express-rate-limit, React, TypeScript, Express

---

## Problem Statement

**Current Issues:**

1. **Poor UX with alert() calls** - SendInvoiceModal and InvoiceDetailPage use blocking alert() dialogs
2. **SendingHistoryPanel layout problem** - Renders outside modal at page bottom, poor visual connection
3. **No rate limiting** - POST /invoices/:id/send has no protection against abuse

## Design Overview

### Fix 1: Toast Notification System

**Library:** react-hot-toast (~3KB)

**Implementation:**
- Install: `npm install react-hot-toast`
- Add `<Toaster />` in App.tsx with dark theme config
- Replace all alert() calls with toast.success() / toast.error()
- Position: top-right, Duration: 3s success / 5s error

**Files:** App.tsx, SendInvoiceModal.tsx, InvoiceDetailPage.tsx

### Fix 2: SendingHistoryPanel Layout

**Goal:** Move panel inside SendInvoiceModal

**Implementation:**
- Add invoiceId prop to SendInvoiceModal
- Embed SendingHistoryPanel at modal bottom
- Remove standalone panel from InvoiceDetailPage (lines 366-370)
- Use sendingHistoryKey for refresh control

**Files:** SendInvoiceModal.tsx, InvoiceDetailPage.tsx

### Fix 3: Rate Limiting

**Strategy:** 5 requests per minute per user

**Implementation:**
- Install: `npm install express-rate-limit`
- Create middleware: backend/src/middleware/rateLimiter.ts
- Apply to POST /:id/send endpoint only
- Return 429 with friendly error message
- Frontend handles 429 with toast.error()

**Files:** rateLimiter.ts (new), invoices.ts, SendInvoiceModal.tsx

## Implementation Order

1. Toast system (infrastructure)
2. Layout fix (uses toast)
3. Rate limiting (uses toast for errors)

## Success Criteria

- ✅ No alert() calls remaining
- ✅ SendingHistoryPanel inside modal
- ✅ Send endpoint limited to 5/min/user
- ✅ Professional UX, ready for production
