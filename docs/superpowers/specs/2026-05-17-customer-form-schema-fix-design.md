# Customer Form Schema Fix Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the schema mismatch between frontend CustomerFormPage and backend Customer model by adding missing required fields (registration_no, id_type, customer_type) and implementing proper B2B/B2C validation.

**Architecture:** Extend existing CustomerFormPage with conditional form sections that show/hide based on customer_type selection. Use framer-motion for smooth transitions. Update backend TIN validation to match Malaysian MyInvois standards (11-13 characters instead of fixed 12).

**Tech Stack:** React, TypeScript, Framer Motion, Zod (backend validation)

---

## Problem Statement

**Current Issue:**
- Backend Customer model requires: `registration_no` (required), `id_type` (required), `customer_type` (required), `tin_number` (12 chars, required for B2B)
- Frontend CustomerFormPage only has: `name`, `email`, `phone`, `tin`, `address_*` fields
- Missing fields cause all customer create/update operations to fail validation

**Root Cause:**
- Previous commit (c9ba75c) had these fields but they were removed in later refactoring
- Backend TIN validation (12 chars fixed) is too strict for Malaysian TIN format (11-13 chars)

## Design Overview

### Form Structure

The form will have 5 sections with progressive disclosure based on customer_type:

1. **Customer Type Selection** (new)
   - Toggle buttons: B2C (default) / B2B
   - Visual style matching SendInvoiceModal send method selection
   - Icons: User (B2C), Building2 (B2B)

2. **Basic Information**
   - Name (required, all types)
   - Existing implementation unchanged

3. **Identity Information** (new)
   - ID Type dropdown (required): NRIC / PASSPORT / BRN / ARMY
   - Registration Number (required, max 50 chars)
   - Dynamic placeholder based on ID Type:
     - NRIC: "e.g., 901234-56-7890"
     - PASSPORT: "e.g., A12345678"
     - BRN: "e.g., 202301234567"
     - ARMY: "e.g., T1234567"

4. **Contact Information**
   - Email (optional, recommended for B2C)
   - Phone (optional, recommended for B2C)
   - Existing validation logic unchanged

5. **Tax & Address Information** (conditional)
   - TIN Number:
     - B2B: required, 11-13 chars
     - B2C: optional, 11-13 chars if provided
     - Placeholder: "IG123456789 or EI00000000020"
   - Address fields (address_line1, address_line2, city, postcode, state_code, country_code):
     - B2B: address_line1 required, others optional
     - B2C: all optional
   - Animated show/hide using framer-motion

### Validation Rules

**Frontend Validation:**

All types:
- Name: required, non-empty
- Registration Number: required, non-empty, max 50 chars
- ID Type: required (default NRIC)
- Email: if provided, must match email format
- Phone: if provided, must match Malaysian format `^(\+60|0)[0-9]{8,10}$`

B2B specific:
- TIN Number: required, 11-13 characters
- Address Line 1: required, non-empty

B2C specific:
- TIN Number: optional, 11-13 characters if provided
- Address: all optional

**Backend Validation Changes:**

File: `backend/src/routes/customers.ts` line 20

Current:
```typescript
tin_number: z.string().length(12).optional(),
```

Change to:
```typescript
tin_number: z.string().min(11).max(13).optional(),
```

Reason: Malaysian TIN format per MyInvois standards is 11-13 characters (individual TINs: "IG" + 9-11 digits). Fixed 12-char validation is too restrictive.

Existing B2B validation logic (lines 36-43) remains unchanged.

### UI/UX Details

**Customer Type Toggle:**
- Two buttons in horizontal layout
- Selected state: highlighted background, colored border and text
- Unselected state: muted background and text
- Animations: `whileHover={{ scale: 1.05 }}`, `whileTap={{ scale: 0.95 }}`
- Style reference: `SendInvoiceModal.tsx` lines 224-257

**Conditional Display Animation:**
- B2B-specific fields wrapped in `motion.div`
- Animation:
  ```tsx
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  exit={{ opacity: 0, height: 0 }}
  transition={{ duration: 0.3 }}
  ```
- Use `AnimatePresence` to handle mount/unmount

**Field Grouping:**
- Each section has `<h3>` heading with consistent styling
- Maintain existing gradient background and border styles
- New sections: "Identity Information", "Tax & Address Information"

**Focus States:**
- Reuse existing `focusedField` state mechanism
- Apply `inputFocusStyle` to all new fields
- Consistent purple border and shadow on focus

**ID Type Dropdown:**
- Native `<select>` element styled to match text inputs
- Options: NRIC, PASSPORT, BRN, ARMY
- Default: NRIC

### Data Flow

**FormData Interface:**
```typescript
interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  registration_no: string;
  id_type: 'NRIC' | 'PASSPORT' | 'BRN' | 'ARMY';
  tin_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  state_code: string;
  country_code: string;
  customer_type: 'B2B' | 'B2C';
}
```

**Initial State:**
```typescript
const [formData, setFormData] = useState<CustomerFormData>({
  name: '',
  email: '',
  phone: '',
  registration_no: '',
  id_type: 'NRIC',
  tin_number: '',
  address_line1: '',
  address_line2: '',
  city: '',
  postcode: '',
  state_code: '',
  country_code: 'MY',
  customer_type: 'B2C',
});
```

**Submit Flow:**
1. User fills form
2. Frontend validation runs on submit
3. If valid, POST/PUT to backend with complete formData
4. Backend Zod validation runs
5. Backend B2B-specific validation runs (if customer_type === 'B2B')
6. Success: navigate to /dashboard/customers
7. Error: display error message at top of form

**Edit Mode:**
1. Load customer data via `customerApi.getById(id)`
2. Populate formData with all fields including customer_type
3. Form automatically shows/hides sections based on loaded customer_type
4. Submit uses PUT instead of POST

### Files to Modify

**Frontend:**
- `frontend/src/pages/CustomerFormPage.tsx`: Add missing fields, conditional rendering, validation logic

**Backend:**
- `backend/src/routes/customers.ts`: Change TIN validation from `.length(12)` to `.min(11).max(13)`

**No changes needed:**
- `backend/src/models/Customer.ts`: Already has all required fields
- `frontend/src/lib/api.ts`: API functions already correct
- Backend B2B validation logic: Already correct

## Testing Strategy

**Manual Testing Checklist:**

1. Create B2C customer:
   - Fill only required fields (name, registration_no, id_type)
   - Leave TIN and address empty
   - Should succeed

2. Create B2B customer:
   - Fill all required fields including TIN (11-13 chars) and address_line1
   - Should succeed

3. B2B validation:
   - Try to create B2B without TIN → should fail with error
   - Try to create B2B without address → should fail with error
   - Try TIN with 10 chars → should fail
   - Try TIN with 14 chars → should fail
   - Try TIN with 11, 12, 13 chars → should succeed

4. Edit existing customer:
   - Load customer, verify all fields populate correctly
   - Change customer_type from B2C to B2B → TIN/address section should appear
   - Change from B2B to B2C → TIN/address section should hide
   - Save changes → should succeed

5. UI/UX:
   - Toggle customer_type → animation should be smooth
   - Focus on fields → purple border should appear
   - Submit with validation errors → error message should display
   - ID Type dropdown → placeholder should update

## References

Malaysian TIN format requirements per MyInvois system:
- Individual TINs: "IG" prefix + 9-11 digits = 11-13 total characters
- Foreign/no TIN: Use "EI00000000020"
- Validation API available at MyInvois SDK

Sources:
- [Malaysia TIN Format Guide](https://www.cleartax.com/my/en/tin-malaysia)
- [MyInvois TIN Validation API](https://sdk.myinvois.hasil.gov.my/einvoicingapi/01-validate-taxpayer-tin/)
- [Malaysia Tax ID Guide](https://lookuptax.com/docs/tax-identification-number/malaysia-tax-id-guide)

## Success Criteria

1. ✅ Frontend form includes all backend-required fields
2. ✅ B2C customers can be created with minimal fields (name, registration_no, id_type)
3. ✅ B2B customers require TIN and address
4. ✅ TIN validation accepts 11-13 character format
5. ✅ Customer type toggle works smoothly with animations
6. ✅ Edit mode correctly loads and displays all fields
7. ✅ No validation errors when creating/updating customers
8. ✅ Form maintains existing visual style and UX patterns
