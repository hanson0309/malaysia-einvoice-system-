# Phase 1 Manual Test Results

**Date:** 2026-05-03  
**Tester:** [Your Name]  
**Environment:** Development (localhost)

---

## Test Environment Setup

- [ ] Backend server running on `http://localhost:3000`
- [ ] Frontend dev server running on `http://localhost:5173` (or configured port)
- [ ] Database connected and populated with test data
- [ ] IRB credentials configured in backend `.env` file

---

## Test 1: Submit to IRB - Success Case

**Objective:** Verify successful invoice submission to IRB

**Steps:**
1. Start dev server: `npm run dev`
2. Navigate to a draft invoice detail page
3. Click "Submit to IRB" button
4. Confirm in the dialog

**Expected Results:**
- [ ] Confirmation dialog appears with text: "确认提交此发票到 MyInvois IRB？\n提交后将无法撤销。"
- [ ] After confirmation, success alert appears: "发票已成功提交到 IRB！"
- [ ] Page reloads automatically
- [ ] IRB information section appears with:
  - [ ] Status badge (blue for "submitted")
  - [ ] UUID displayed
  - [ ] Submitted timestamp displayed
  - [ ] Refresh button visible (for submitted status)
- [ ] "Submit to IRB" button disappears

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 2: Submit to IRB - Missing Credentials Error

**Objective:** Verify friendly error message when IRB credentials are not configured

**Steps:**
1. Temporarily remove or comment out IRB credentials in backend `.env`
2. Restart backend server
3. Navigate to a draft invoice detail page
4. Click "Submit to IRB" button
5. Confirm in the dialog

**Expected Results:**
- [ ] Error alert appears: "IRB 凭证未配置，请联系系统管理员配置 MyInvois Client ID 和 Secret。"
- [ ] Button returns to enabled state
- [ ] No IRB section appears

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 3: Submit to IRB - Network Error

**Objective:** Verify error handling for network issues

**Steps:**
1. Stop the backend server
2. Navigate to a draft invoice detail page
3. Click "Submit to IRB" button
4. Confirm in the dialog

**Expected Results:**
- [ ] Error alert appears with network error message
- [ ] Button returns to enabled state
- [ ] No IRB section appears

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 4: IRB Information Display

**Objective:** Verify all IRB fields display correctly

**Prerequisites:** Invoice already submitted to IRB with all fields populated

**Steps:**
1. Navigate to an invoice that has been submitted to IRB
2. Verify all IRB information is displayed

**Expected Results:**
- [ ] IRB section is visible (blue background)
- [ ] Section title: "IRB MyInvois Information"
- [ ] Status badge displays with correct color:
  - [ ] Blue for "submitted"
  - [ ] Green for "accepted"
  - [ ] Red for "rejected"
  - [ ] Gray for "cancelled"
- [ ] UUID displays correctly (format: dca08a1b-...)
- [ ] Submitted timestamp displays in readable format (e.g., "May 3, 2026, 10:30 AM")
- [ ] Validation code displays (if present)
- [ ] QR code image displays (if present)
- [ ] All text is readable and properly formatted

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 5: Refresh Status - Submitted Invoice

**Objective:** Verify refresh button works for submitted invoices

**Prerequisites:** Invoice with status "submitted"

**Steps:**
1. Navigate to an invoice with status "submitted"
2. Click "刷新状态" button
3. Wait for response

**Expected Results:**
- [ ] Refresh button is visible (only for submitted status)
- [ ] Button shows loading state: "刷新中..." with spinning icon
- [ ] Button is disabled during refresh
- [ ] Alert appears with one of:
  - [ ] "状态已更新为：{newStatus}" (if status changed)
  - [ ] "状态无变化，仍为：submitted" (if status unchanged)
- [ ] Page data refreshes after alert
- [ ] Button returns to normal state: "刷新状态"

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 6: Refresh Status - Final State Invoice

**Objective:** Verify refresh button is hidden for final state invoices

**Prerequisites:** Invoice with status "accepted" or "rejected"

**Steps:**
1. Navigate to an invoice with status "accepted"
2. Check IRB information section
3. Navigate to an invoice with status "rejected"
4. Check IRB information section

**Expected Results:**
- [ ] Refresh button does NOT appear for "accepted" status
- [ ] Refresh button does NOT appear for "rejected" status
- [ ] IRB information section still displays all other fields

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 7: Refresh Status - Error Handling

**Objective:** Verify error handling when refresh fails

**Steps:**
1. Navigate to an invoice with status "submitted"
2. Stop the backend server
3. Click "刷新状态" button

**Expected Results:**
- [ ] Error alert appears: "无法获取最新状态，请稍后重试"
- [ ] Button returns to normal state
- [ ] Page remains functional

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 8: Responsive Layout - Desktop

**Objective:** Verify layout works on desktop viewport

**Steps:**
1. Set browser window to desktop size (1920x1080)
2. Navigate to an invoice with IRB data
3. Check layout

**Expected Results:**
- [ ] IRB section displays in 2-column grid
- [ ] All fields are readable
- [ ] Refresh button is properly aligned
- [ ] QR code is visible and appropriately sized
- [ ] No horizontal scrolling required

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 9: Responsive Layout - Mobile

**Objective:** Verify layout works on mobile viewport

**Steps:**
1. Resize browser window to mobile size (375x667)
2. Navigate to an invoice with IRB data
3. Check layout

**Expected Results:**
- [ ] IRB section collapses to single column
- [ ] All fields remain readable
- [ ] Refresh button is accessible
- [ ] QR code is visible
- [ ] No horizontal scrolling required
- [ ] Touch targets are appropriately sized

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 10: Button Visibility Logic

**Objective:** Verify "Submit to IRB" button appears only for eligible invoices

**Steps:**
1. Navigate to a draft invoice without IRB submission
2. Navigate to a draft invoice already submitted to IRB
3. Navigate to a paid invoice without IRB submission
4. Navigate to a cancelled invoice

**Expected Results:**
- [ ] Button appears for: draft invoice without `lhdn_submission_uid`
- [ ] Button does NOT appear for: draft invoice with `lhdn_submission_uid`
- [ ] Button does NOT appear for: paid invoice
- [ ] Button does NOT appear for: cancelled invoice

**Actual Results:**
```
[Record what actually happened]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 11: Console Errors Check

**Objective:** Verify no console errors during normal operation

**Steps:**
1. Open browser DevTools console
2. Navigate to invoice detail page
3. Perform submit and refresh operations
4. Check console for errors

**Expected Results:**
- [ ] No console errors during page load
- [ ] No console errors during submit operation
- [ ] No console errors during refresh operation
- [ ] No console warnings (except expected development warnings)

**Actual Results:**
```
[Record console output]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Test 12: TypeScript Build Verification

**Objective:** Verify TypeScript compilation succeeds

**Steps:**
1. Run `npm run build` in frontend directory
2. Check for TypeScript errors

**Expected Results:**
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No TypeScript warnings (or only expected warnings)

**Actual Results:**
```
[Record build output]
```

**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
```
[Any observations or issues]
```

---

## Summary

**Total Tests:** 12  
**Passed:** ___  
**Failed:** ___  
**Pass Rate:** ___%

### Critical Issues Found
```
[List any critical issues that block functionality]
```

### Important Issues Found
```
[List any important issues that affect user experience]
```

### Minor Issues Found
```
[List any minor issues or improvements]
```

### Overall Assessment
```
[Your overall assessment of Phase 1 implementation]
```

### Recommendations
```
[Any recommendations for fixes or improvements before Phase 2]
```

---

## Sign-off

**Tester Signature:** ___________________  
**Date:** ___________________  
**Status:** ⬜ Approved for Production / ⬜ Requires Fixes
