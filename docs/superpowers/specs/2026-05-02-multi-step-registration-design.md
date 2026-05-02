# Multi-Step Registration Form Design

**Date:** 2026-05-02  
**Status:** Approved  
**Author:** Claude (Opus 4.7)

## Problem Statement

The current registration form only collects company name, email, and password, but the backend requires 11+ fields including company registration details, TIN number, business activity code, and full address information for Malaysian invoice compliance. This mismatch causes all registration attempts to fail with validation errors.

## Solution Overview

Implement a 3-step registration wizard that collects all required backend fields across multiple screens, improving UX by not overwhelming users with a single large form. All data is stored in React state and submitted atomically on the final step.

## Design Decisions

### Approach
**Client-side state only** - Store all form data in React state across steps, only submit to backend on final step with complete data.

**Rationale:** 
- Simple implementation, no backend changes required
- Atomic registration (all-or-nothing) matches backend expectations
- Registration typically completed in one session
- Backend schema expects complete data anyway

**Trade-offs:**
- Progress lost if user closes browser mid-registration
- Acceptable because registration is typically a single-session flow

### Step Count
**3 steps** - Balances progress feeling with manageable field count per step (~4-5 fields each)

**Alternatives considered:**
- 4 steps: More granular but feels slower
- 2 steps: Front-loads simplicity but step 2 has 9 fields (too heavy)

## Architecture

### Component Structure

```
RegisterPage.tsx (container)
├── ProgressIndicator.tsx (1/3, 2/3, 3/3)
├── RegisterStep1.tsx (Basic info)
├── RegisterStep2.tsx (Company details)
└── RegisterStep3.tsx (Address & contact)
```

### RegisterPage.tsx (Main Container)
**Responsibilities:**
- Manage current step (1-3) via state
- Store all form data in single state object
- Handle step navigation (next, back)
- Submit complete data on step 3
- Display errors from backend

**State:**
```typescript
const [currentStep, setCurrentStep] = useState(1);
const [formData, setFormData] = useState({
  // Step 1
  company_name: '',
  email: '',
  password: '',
  confirmPassword: '', // frontend only
  
  // Step 2
  company_registration_no: '',
  tin_number: '',
  business_activity_code: '',
  sst_registration_no: '',
  
  // Step 3
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  postcode: '',
  state_code: '',
  country_code: 'MY'
});
const [error, setError] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

### Step Components
**Location:** `frontend/src/components/register/`

Each step component:
- Receives `formData` and `onChange` handler as props
- Validates its own fields
- Returns boolean from `validate()` method
- Uses existing art deco styling from `login.css`
- Displays field-level validation errors

**RegisterStep1.tsx - Basic Information**
- Company name (required)
- Email address (required, email format)
- Password (required, min 8 chars)
- Confirm password (required, must match password)

**RegisterStep2.tsx - Company Details**
- Company registration number (required)
- TIN number (required, exactly 12 digits)
- Business activity code (required)
- SST registration number (optional)

**RegisterStep3.tsx - Address & Contact**
- Phone number (required)
- Address line 1 (required)
- Address line 2 (optional)
- City (required)
- Postcode (required)
- State (required, dropdown with Malaysian states)
- Country (default: MY, hidden or disabled)

### ProgressIndicator.tsx
**Location:** `frontend/src/components/register/ProgressIndicator.tsx`

**Props:**
- `currentStep: number` (1-3)
- `totalSteps: number` (3)

**Display:**
- Visual progress bar showing completion percentage
- Step numbers with labels
- Highlight current step

## Data Flow

### Step Navigation
1. User fills out Step 1 fields
2. Clicks "Next" → validates Step 1 → moves to Step 2
3. User fills out Step 2 fields
4. Clicks "Next" → validates Step 2 → moves to Step 3
5. User fills out Step 3 fields
6. Clicks "Create Account" → validates Step 3 → submits all data

### Back Navigation
- "Back" button available on steps 2 and 3
- Returns to previous step without validation
- Preserves all entered data

### Submission
On final step submit:
1. Validate Step 3 fields
2. Remove `confirmPassword` from data
3. Call `authApi.register()` with complete data object
4. Backend validates and creates tenant + user
5. On success: store tokens, redirect to dashboard
6. On error: display error message, allow user to go back and fix

## Validation Rules

### Step 1 Validation
- `company_name`: Non-empty, max 200 chars
- `email`: Valid email format, max 100 chars
- `password`: Min 8 chars, max 100 chars
- `confirmPassword`: Must match password

### Step 2 Validation
- `company_registration_no`: Non-empty, max 50 chars
- `tin_number`: Exactly 12 digits
- `business_activity_code`: Non-empty, max 10 chars
- `sst_registration_no`: Optional, max 50 chars if provided

### Step 3 Validation
- `phone`: Non-empty, max 20 chars
- `address_line1`: Non-empty, max 200 chars
- `address_line2`: Optional, max 200 chars if provided
- `city`: Non-empty, max 100 chars
- `postcode`: Non-empty, max 10 chars
- `state_code`: Non-empty, exactly 2 chars (dropdown selection)
- `country_code`: Default 'MY'

### Validation Behavior
- "Next" button disabled until current step validates
- "Back" button always enabled (except step 1)
- Real-time validation on blur or after first submit attempt
- Display field-level errors below each input

## API Changes

### authApi.register()
**Current:**
```typescript
register: (data: { email: string; password: string; companyName: string })
```

**New:**
```typescript
register: (data: {
  company_name: string;
  company_registration_no: string;
  tin_number: string;
  business_activity_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  state_code: string;
  country_code: string;
  email: string;
  phone: string;
  password: string;
  sst_registration_no?: string;
})
```

### AuthContext.register()
**Update signature to accept complete registration data object instead of individual parameters.**

## Error Handling

### Backend Validation Errors
- Display error message at top of current step
- Allow user to navigate back to fix errors in previous steps
- Preserve all form data during error state

### Network Errors
- Display generic error message
- Provide "Try Again" button
- Preserve all form data

### Field-Level Errors
- Show validation errors below each field
- Clear errors when user corrects the field
- Prevent navigation until errors resolved

## UI/UX Considerations

### Styling
- Reuse existing art deco aesthetic from current login/register pages
- Maintain consistent form styling from `login.css`
- Progress indicator uses accent colors
- Smooth transitions between steps

### Accessibility
- Proper form labels and ARIA attributes
- Keyboard navigation support
- Focus management when changing steps
- Error announcements for screen readers

### Mobile Responsiveness
- Stack form fields vertically on mobile
- Ensure progress indicator is visible
- Touch-friendly button sizes

## Malaysian State Codes

Provide dropdown with these options:
- JHR - Johor
- KDH - Kedah
- KTN - Kelantan
- KUL - Kuala Lumpur
- LBN - Labuan
- MLK - Melaka
- NSN - Negeri Sembilan
- PHG - Pahang
- PJY - Putrajaya
- PLS - Perlis
- PNG - Penang
- PRK - Perak
- SBH - Sabah
- SGR - Selangor
- SWK - Sarawak
- TRG - Terengganu

## Files to Create

1. `frontend/src/components/register/RegisterStep1.tsx`
2. `frontend/src/components/register/RegisterStep2.tsx`
3. `frontend/src/components/register/RegisterStep3.tsx`
4. `frontend/src/components/register/ProgressIndicator.tsx`

## Files to Modify

1. `frontend/src/pages/RegisterPage.tsx` - Convert to multi-step container
2. `frontend/src/lib/api.ts` - Update `authApi.register()` signature
3. `frontend/src/contexts/AuthContext.tsx` - Update `register()` signature

## Testing Considerations

### Manual Testing Checklist
- [ ] Step 1 validation prevents navigation with invalid data
- [ ] Step 2 TIN validation requires exactly 12 digits
- [ ] Step 3 state dropdown shows all Malaysian states
- [ ] Back button preserves all entered data
- [ ] Complete registration creates tenant and user
- [ ] Backend validation errors display correctly
- [ ] Progress indicator updates on each step
- [ ] Mobile responsive layout works

### Edge Cases
- User clicks back multiple times
- User enters invalid TIN format
- Backend returns validation error for specific field
- Network timeout during submission
- User refreshes page mid-registration (data lost - expected)

## Success Criteria

1. Users can complete registration with all required fields
2. Registration succeeds and creates tenant + user in database
3. Form validates data before submission
4. Users can navigate back to edit previous steps
5. Error messages are clear and actionable
6. UI maintains art deco aesthetic consistency
7. Mobile experience is smooth and usable

## Future Enhancements (Out of Scope)

- LocalStorage persistence for draft registrations
- Email verification step
- Company registration number validation against external API
- Auto-fill address from postcode lookup
- Password strength indicator
- Multi-language support
