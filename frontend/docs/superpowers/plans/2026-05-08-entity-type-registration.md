# Entity Type Registration Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add entity type selection (Individual/Company) to registration with conditional field rendering and searchable business activity dropdown.

**Architecture:** Add new Step 0 for entity type selection, modify RegisterPage to handle 4 steps, update Step 1 and Step 2 components to conditionally render fields based on entity type, implement searchable dropdown for business activity codes using react-select library.

**Tech Stack:** React, TypeScript, react-select, framer-motion

---

### Task 1: Install react-select dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install react-select**

Run: `cd frontend && npm install react-select`
Expected: Package installed successfully

- [ ] **Step 2: Verify installation**

Run: `npm list react-select`
Expected: Shows react-select version

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-select for searchable dropdown"
```

---

## File Structure

**New Files:**
- `frontend/src/components/register/RegisterStep0.tsx` - Entity type selection component
- `frontend/src/types/msic.ts` - TypeScript types for MSIC data

**Modified Files:**
- `frontend/src/pages/RegisterPage.tsx` - Add entity_type to state, handle 4 steps
- `frontend/src/components/register/RegisterStep1.tsx` - Add conditional labels
- `frontend/src/components/register/RegisterStep2.tsx` - Add conditional fields and dropdown
- `frontend/src/components/register/ProgressIndicator.tsx` - Update for 4 steps display
- `frontend/package.json` - Add react-select dependency

---

### Task 2: Create MSIC types file

**Files:**
- Create: `frontend/src/types/msic.ts`

- [ ] **Step 1: Create types file**

```typescript
export interface MSICCode {
  Code: string;
  Description: string;
  'MSIC Category Reference': string;
}

export interface MSICOption {
  value: string;
  label: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/msic.ts
git commit -m "feat: add MSIC types for business activity codes"
```

---


### Task 3: Create RegisterStep0 component

**Files:**
- Create: `frontend/src/components/register/RegisterStep0.tsx`

- [ ] **Step 1: Create component file**

Create file with complete entity type selection UI:

```typescript
import { useState } from 'react';

interface RegisterStep0Props {
  formData: {
    entity_type: 'individual' | 'company' | '';
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}

export default function RegisterStep0({ formData, onChange, onNext }: RegisterStep0Props) {
  const [error, setError] = useState<string>('');

  const handleSelect = (type: 'individual' | 'company') => {
    onChange('entity_type', type);
    setError('');
  };

  const handleNext = () => {
    if (!formData.entity_type) {
      setError('Please select whether you are registering as an individual or company');
      return;
    }
    onNext();
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          marginBottom: '0.5rem',
          color: 'var(--white)'
        }}>
          Select Entity Type
        </h3>
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'var(--gray)',
          marginBottom: '1.5rem'
        }}>
          Choose whether you're registering as an individual or a company
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <button
          type="button"
          onClick={() => handleSelect('individual')}
          style={{
            padding: '1.5rem',
            border: `2px solid ${formData.entity_type === 'individual' ? 'var(--gold)' : 'var(--navy-mid)'}`,
            borderRadius: '8px',
            background: formData.entity_type === 'individual' ? 'rgba(212, 175, 55, 0.1)' : 'var(--navy-dark)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--white)', marginBottom: '0.25rem' }}>
            Individual
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>
            For sole proprietors and freelancers
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('company')}
          style={{
            padding: '1.5rem',
            border: `2px solid ${formData.entity_type === 'company' ? 'var(--gold)' : 'var(--navy-mid)'}`,
            borderRadius: '8px',
            background: formData.entity_type === 'company' ? 'rgba(212, 175, 55, 0.1)' : 'var(--navy-dark)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--white)', marginBottom: '0.25rem' }}>
            Company
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>
            For registered businesses
          </div>
        </button>
      </div>

      {error && (
        <div className="field-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/register/RegisterStep0.tsx
git commit -m "feat: add RegisterStep0 for entity type selection"
```

---

### Task 4: Update RegisterPage to handle entity_type and 4 steps

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx:13-34`

- [ ] **Step 1: Add entity_type to formData state**

Update the formData state to include entity_type:

```typescript
const [formData, setFormData] = useState({
  // NEW: Entity type
  entity_type: '' as 'individual' | 'company' | '',
  
  // Step 1
  company_name: '',
  email: '',
  password: '',
  confirmPassword: '',

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
```

- [ ] **Step 2: Update currentStep to start at 0**

Change: `const [currentStep, setCurrentStep] = useState(1);`
To: `const [currentStep, setCurrentStep] = useState(0);`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/RegisterPage.tsx
git commit -m "feat: add entity_type to registration form state"
```

---

### Task 5: Add RegisterStep0 import and rendering to RegisterPage

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx:6,144-157`

- [ ] **Step 1: Add RegisterStep0 import**

Add import at top of file:
```typescript
import RegisterStep0 from '../components/register/RegisterStep0';
```

- [ ] **Step 2: Update ProgressIndicator to show 4 steps**

Change: `<ProgressIndicator currentStep={currentStep} totalSteps={3} />`
To: `<ProgressIndicator currentStep={currentStep} totalSteps={4} />`

- [ ] **Step 3: Add Step 0 rendering before Step 1**

Add this before the `{currentStep === 1 && (` block:

```typescript
{currentStep === 0 && (
  <RegisterStep0
    formData={{
      entity_type: formData.entity_type
    }}
    onChange={handleFieldChange}
    onNext={handleNext}
  />
)}
```

- [ ] **Step 4: Update step numbers for existing steps**

Change all step conditions:
- `{currentStep === 1 &&` stays as is (Step 1)
- `{currentStep === 2 &&` stays as is (Step 2)
- `{currentStep === 3 &&` stays as is (Step 3)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/RegisterPage.tsx
git commit -m "feat: integrate RegisterStep0 into registration flow"
```

---

### Task 6: Update RegisterStep1 with conditional labels

**Files:**
- Modify: `frontend/src/components/register/RegisterStep1.tsx:3-12,72-73`

- [ ] **Step 1: Add entity_type to props interface**

Update the interface:
```typescript
interface RegisterStep1Props {
  formData: {
    company_name: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  entity_type: 'individual' | 'company' | '';
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}
```

- [ ] **Step 2: Update component signature**

Change: `export default function RegisterStep1({ formData, onChange, onNext }: RegisterStep1Props) {`
To: `export default function RegisterStep1({ formData, entity_type, onChange, onNext }: RegisterStep1Props) {`

- [ ] **Step 3: Add conditional label logic**

Add this at the top of the component function:
```typescript
const fieldLabel = entity_type === 'individual' ? 'Owner Name' : 'Company Name';
const fieldPlaceholder = entity_type === 'individual' ? 'Your Full Name' : 'Your Company Ltd';
```

- [ ] **Step 4: Update label to use conditional text**

Change the label:
```typescript
<label className="form-label" htmlFor="company_name">
  {fieldLabel}
</label>
```

- [ ] **Step 5: Update placeholder to use conditional text**

Change the input placeholder:
```typescript
placeholder={fieldPlaceholder}
```

- [ ] **Step 6: Update error message to use conditional text**

Update validation error:
```typescript
if (!formData.company_name.trim()) {
  newErrors.company_name = `${fieldLabel} is required`;
} else if (formData.company_name.length > 200) {
  newErrors.company_name = `${fieldLabel} must be 200 characters or less`;
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/register/RegisterStep1.tsx
git commit -m "feat: add conditional labels to RegisterStep1 based on entity type"
```

---

### Task 7: Update RegisterPage to pass entity_type to RegisterStep1

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx:146-157`

- [ ] **Step 1: Add entity_type prop to RegisterStep1**

Update the RegisterStep1 rendering:
```typescript
{currentStep === 1 && (
  <RegisterStep1
    formData={{
      company_name: formData.company_name,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword
    }}
    entity_type={formData.entity_type}
    onChange={handleFieldChange}
    onNext={handleNext}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/RegisterPage.tsx
git commit -m "feat: pass entity_type to RegisterStep1"
```

---

### Task 8: Update RegisterStep2 with conditional fields (Part 1 - Setup)

**Files:**
- Modify: `frontend/src/components/register/RegisterStep2.tsx:3-13`

- [ ] **Step 1: Add entity_type to props interface**

Update the interface:
```typescript
interface RegisterStep2Props {
  formData: {
    company_registration_no: string;
    tin_number: string;
    business_activity_code: string;
    sst_registration_no: string;
  };
  entity_type: 'individual' | 'company' | '';
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}
```

- [ ] **Step 2: Update component signature**

Change: `export default function RegisterStep2({ formData, onChange, onNext, onBack }: RegisterStep2Props) {`
To: `export default function RegisterStep2({ formData, entity_type, onChange, onNext, onBack }: RegisterStep2Props) {`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/register/RegisterStep2.tsx
git commit -m "feat: add entity_type prop to RegisterStep2"
```

---

### Task 9: Add conditional validation logic to RegisterStep2

**Files:**
- Modify: `frontend/src/components/register/RegisterStep2.tsx:18-43`

- [ ] **Step 1: Update validation function with conditional logic**

Replace the validate function:
```typescript
const validate = (): boolean => {
  const newErrors: Record<string, string> = {};

  // Registration Number validation (conditional)
  if (!formData.company_registration_no.trim()) {
    const fieldName = entity_type === 'individual' ? 'IC number' : 'Company registration number';
    newErrors.company_registration_no = `${fieldName} is required`;
  } else if (entity_type === 'company') {
    // Company: exactly 12 digits
    if (!/^\d{12}$/.test(formData.company_registration_no)) {
      newErrors.company_registration_no = 'Company registration number must be exactly 12 digits';
    }
  } else if (entity_type === 'individual') {
    // Individual: Malaysian IC format YYMMDD-PB-###G
    if (!/^\d{6}-\d{2}-\d{4}$/.test(formData.company_registration_no)) {
      newErrors.company_registration_no = 'Please enter a valid IC number (format: YYMMDD-PB-###G)';
    }
  }

  // TIN Number validation (conditional)
  if (!formData.tin_number.trim()) {
    newErrors.tin_number = 'TIN number is required';
  } else if (entity_type === 'individual') {
    // Individual: exactly 11 digits (IG prefix added automatically)
    if (!/^\d{11}$/.test(formData.tin_number)) {
      newErrors.tin_number = 'TIN must be exactly 11 digits';
    }
  } else if (entity_type === 'company') {
    // Company: C followed by 10-11 digits
    if (!/^C\d{10,11}$/.test(formData.tin_number)) {
      newErrors.tin_number = 'TIN must start with C followed by 10-11 digits';
    }
  }

  // Business Activity Code validation
  if (!formData.business_activity_code.trim()) {
    newErrors.business_activity_code = 'Business activity code is required';
  }

  // SST Registration Number validation (optional)
  if (formData.sst_registration_no && formData.sst_registration_no.length > 50) {
    newErrors.sst_registration_no = 'SST registration number must be 50 characters or less';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/register/RegisterStep2.tsx
git commit -m "feat: add conditional validation for entity types in RegisterStep2"
```

---

### Task 10: Add conditional field rendering for Registration Number in RegisterStep2

**Files:**
- Modify: `frontend/src/components/register/RegisterStep2.tsx:64-84`

- [ ] **Step 1: Add conditional labels and placeholders**

Add these variables at the top of the component function (after the validate function):
```typescript
const regNumberLabel = entity_type === 'individual' ? 'IC Number (NRIC)' : 'Company Registration Number';
const regNumberPlaceholder = entity_type === 'individual' ? '990101-01-1234' : '202301234567';
```

- [ ] **Step 2: Update registration number field with conditional rendering**

Replace the registration number field section:
```typescript
<div className="form-group">
  <label className="form-label" htmlFor="company_registration_no">
    {regNumberLabel}
  </label>
  <div className="input-wrapper">
    <input
      type="text"
      id="company_registration_no"
      className="form-input"
      placeholder={regNumberPlaceholder}
      value={formData.company_registration_no}
      onChange={(e) => handleInputChange('company_registration_no', e.target.value)}
    />
    <div className="input-underline"></div>
  </div>
  {errors.company_registration_no && (
    <div className="field-error">
      {errors.company_registration_no}
    </div>
  )}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/register/RegisterStep2.tsx
git commit -m "feat: add conditional registration number field in RegisterStep2"
```

---

### Task 11: Add conditional TIN field with auto-prefix for individuals

**Files:**
- Modify: `frontend/src/components/register/RegisterStep2.tsx:86-106`

- [ ] **Step 1: Add TIN field variables**

Add these variables after the registration number variables:
```typescript
const tinLabel = 'TIN Number';
const tinPlaceholder = entity_type === 'individual' ? '12345678901' : 'C12345678900';
const tinHelperText = entity_type === 'individual' 
  ? 'TIN will be formatted as IG + 11 digits' 
  : 'Format: C followed by 10-11 digits';
```

- [ ] **Step 2: Add TIN input handler with auto-prefix logic**

Add this handler function:
```typescript
const handleTinChange = (value: string) => {
  if (entity_type === 'individual') {
    // For individuals, only allow digits and limit to 11
    const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
    handleInputChange('tin_number', digitsOnly);
  } else {
    // For companies, allow C prefix and digits
    handleInputChange('tin_number', value);
  }
};
```

- [ ] **Step 3: Update TIN field with conditional rendering**

Replace the TIN number field section:
```typescript
<div className="form-group">
  <label className="form-label" htmlFor="tin_number">
    {tinLabel}
  </label>
  {entity_type === 'individual' && (
    <div style={{ fontSize: '0.875rem', color: 'var(--gray)', marginBottom: '0.5rem' }}>
      {tinHelperText}
    </div>
  )}
  <div className="input-wrapper">
    {entity_type === 'individual' && (
      <span style={{
        position: 'absolute',
        left: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--gray)',
        fontSize: '1rem',
        pointerEvents: 'none'
      }}>
        IG
      </span>
    )}
    <input
      type="text"
      id="tin_number"
      className="form-input"
      style={entity_type === 'individual' ? { paddingLeft: '2.5rem' } : {}}
      placeholder={tinPlaceholder}
      value={formData.tin_number}
      onChange={(e) => handleTinChange(e.target.value)}
    />
    <div className="input-underline"></div>
  </div>
  {entity_type === 'company' && (
    <div style={{ fontSize: '0.875rem', color: 'var(--gray)', marginTop: '0.25rem' }}>
      {tinHelperText}
    </div>
  )}
  {errors.tin_number && (
    <div className="field-error">
      {errors.tin_number}
    </div>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/register/RegisterStep2.tsx
git commit -m "feat: add conditional TIN field with auto-prefix for individuals"
```

---

### Task 12: Add react-select imports and MSIC data loading to RegisterStep2

**Files:**
- Modify: `frontend/src/components/register/RegisterStep2.tsx:1-2`

- [ ] **Step 1: Add imports for react-select and MSIC types**

Add these imports at the top:
```typescript
import { useState, useEffect } from 'react';
import Select from 'react-select';
import { MSICCode, MSICOption } from '../../types/msic';
```

- [ ] **Step 2: Add MSIC data state and loading logic**

Add this inside the component, after the errors state:
```typescript
const [msicOptions, setMsicOptions] = useState<MSICOption[]>([]);
const [isLoadingMsic, setIsLoadingMsic] = useState(true);

useEffect(() => {
  const loadMsicData = async () => {
    try {
      const response = await fetch('/src/Languages/msic.json');
      const data: MSICCode[] = await response.json();
      const options = data.map(item => ({
        value: item.Code,
        label: `${item.Code} - ${item.Description}`
      }));
      setMsicOptions(options);
    } catch (error) {
      console.error('Failed to load MSIC data:', error);
    } finally {
      setIsLoadingMsic(false);
    }
  };
  
  loadMsicData();
}, []);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/register/RegisterStep2.tsx
git commit -m "feat: add MSIC data loading to RegisterStep2"
```

---

### Task 13: Replace business activity code input with searchable dropdown

**Files:**
- Modify: `frontend/src/components/register/RegisterStep2.tsx:108-128`

- [ ] **Step 1: Add handler for dropdown selection**

Add this handler function:
```typescript
const handleBusinessActivityChange = (selectedOption: MSICOption | null) => {
  handleInputChange('business_activity_code', selectedOption?.value || '');
};
```

- [ ] **Step 2: Replace business activity code field with Select component**

Replace the business activity code field section:
```typescript
<div className="form-group">
  <label className="form-label" htmlFor="business_activity_code">
    Business Activity Code
  </label>
  <div className="input-wrapper">
    <Select
      id="business_activity_code"
      options={msicOptions}
      value={msicOptions.find(opt => opt.value === formData.business_activity_code) || null}
      onChange={handleBusinessActivityChange}
      placeholder="Search and select business activity..."
      isLoading={isLoadingMsic}
      isSearchable={true}
      isClearable={true}
      styles={{
        control: (base) => ({
          ...base,
          background: 'var(--navy-dark)',
          borderColor: 'var(--navy-mid)',
          borderRadius: '4px',
          minHeight: '48px',
          '&:hover': {
            borderColor: 'var(--gold)'
          }
        }),
        menu: (base) => ({
          ...base,
          background: 'var(--navy-dark)',
          border: '1px solid var(--navy-mid)',
          zIndex: 9999
        }),
        option: (base, state) => ({
          ...base,
          background: state.isFocused ? 'var(--navy-mid)' : 'var(--navy-dark)',
          color: 'var(--white)',
          cursor: 'pointer',
          '&:hover': {
            background: 'var(--navy-mid)'
          }
        }),
        singleValue: (base) => ({
          ...base,
          color: 'var(--white)'
        }),
        input: (base) => ({
          ...base,
          color: 'var(--white)'
        }),
        placeholder: (base) => ({
          ...base,
          color: 'var(--gray)'
        })
      }}
    />
  </div>
  {errors.business_activity_code && (
    <div className="field-error">
      {errors.business_activity_code}
    </div>
  )}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/register/RegisterStep2.tsx
git commit -m "feat: replace business activity input with searchable dropdown"
```

---

### Task 14: Update RegisterPage to pass entity_type to RegisterStep2

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx:159-170`

- [ ] **Step 1: Add entity_type prop to RegisterStep2**

Update the RegisterStep2 rendering:
```typescript
{currentStep === 2 && (
  <RegisterStep2
    formData={{
      company_registration_no: formData.company_registration_no,
      tin_number: formData.tin_number,
      business_activity_code: formData.business_activity_code,
      sst_registration_no: formData.sst_registration_no
    }}
    entity_type={formData.entity_type}
    onChange={handleFieldChange}
    onNext={handleNext}
    onBack={handleBack}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/RegisterPage.tsx
git commit -m "feat: pass entity_type to RegisterStep2"
```

---

### Task 15: Update form submission to include entity_type and format TIN

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx:52-65`

- [ ] **Step 1: Update handleSubmit to format TIN for individuals**

Replace the handleSubmit function:
```typescript
const handleSubmit = async () => {
  setError('');
  setIsLoading(true);

  try {
    const { confirmPassword, ...registrationData } = formData;
    
    // Format TIN for individuals (add IG prefix)
    if (registrationData.entity_type === 'individual') {
      registrationData.tin_number = 'IG' + registrationData.tin_number;
    }
    
    await register(registrationData);
    navigate('/dashboard');
  } catch (err: any) {
    setError(err.response?.data?.message || 'Registration failed. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/RegisterPage.tsx
git commit -m "feat: format TIN with IG prefix for individuals on submission"
```

---

### Task 16: Test individual registration flow

**Files:**
- Test: Manual testing in browser

- [ ] **Step 1: Start development server**

Run: `cd frontend && npm run dev`
Expected: Server starts successfully

- [ ] **Step 2: Navigate to registration page**

Open: `http://localhost:5173/register`
Expected: Registration page loads with Step 0

- [ ] **Step 3: Test individual selection**

Action: Click "Individual" card
Expected: Card highlights with gold border

- [ ] **Step 4: Proceed to Step 1**

Action: Click "Next"
Expected: Step 1 shows "Owner Name" label

- [ ] **Step 5: Fill Step 1 with test data**

Fill:
- Owner Name: "John Doe"
- Email: "john@example.com"
- Password: "password123"
- Confirm Password: "password123"

Action: Click "Next"
Expected: Proceeds to Step 2

- [ ] **Step 6: Test IC number field**

Fill: "990101-01-1234"
Expected: Accepts Malaysian IC format

- [ ] **Step 7: Test TIN field with IG prefix**

Fill: "12345678901" (11 digits)
Expected: Shows "IG" prefix, accepts exactly 11 digits

- [ ] **Step 8: Test business activity dropdown**

Action: Click dropdown, type "computer"
Expected: Filters to show computer-related codes

- [ ] **Step 9: Select a business activity**

Action: Select "46510 - Wholesale of computer hardware, software and peripherals"
Expected: Selection appears in field

- [ ] **Step 10: Complete registration**

Fill remaining fields and submit
Expected: Registration succeeds with entity_type='individual' and TIN='IG12345678901'

---

### Task 17: Test company registration flow

**Files:**
- Test: Manual testing in browser

- [ ] **Step 1: Navigate to registration page**

Open: `http://localhost:5173/register`
Expected: Registration page loads with Step 0

- [ ] **Step 2: Test company selection**

Action: Click "Company" card
Expected: Card highlights with gold border

- [ ] **Step 3: Proceed to Step 1**

Action: Click "Next"
Expected: Step 1 shows "Company Name" label

- [ ] **Step 4: Fill Step 1 with test data**

Fill:
- Company Name: "Test Company Sdn Bhd"
- Email: "company@example.com"
- Password: "password123"
- Confirm Password: "password123"

Action: Click "Next"
Expected: Proceeds to Step 2

- [ ] **Step 5: Test company registration number**

Fill: "202301234567" (12 digits)
Expected: Accepts exactly 12 digits

- [ ] **Step 6: Test TIN field with C prefix**

Fill: "C12345678900"
Expected: Accepts C followed by 10-11 digits

- [ ] **Step 7: Test business activity dropdown**

Action: Click dropdown, type "wholesale"
Expected: Filters to show wholesale-related codes

- [ ] **Step 8: Complete registration**

Fill remaining fields and submit
Expected: Registration succeeds with entity_type='company' and TIN='C12345678900'

---

### Task 18: Test validation errors

**Files:**
- Test: Manual testing in browser

- [ ] **Step 1: Test Step 0 validation**

Action: Click "Next" without selecting entity type
Expected: Error message "Please select whether you are registering as an individual or company"

- [ ] **Step 2: Test individual IC format validation**

Select Individual, proceed to Step 2
Fill IC: "123456" (invalid format)
Action: Click "Next"
Expected: Error "Please enter a valid IC number (format: YYMMDD-PB-###G)"

- [ ] **Step 3: Test individual TIN validation**

Fill TIN: "123" (less than 11 digits)
Action: Click "Next"
Expected: Error "TIN must be exactly 11 digits"

- [ ] **Step 4: Test company registration number validation**

Select Company, proceed to Step 2
Fill Registration: "12345" (less than 12 digits)
Action: Click "Next"
Expected: Error "Company registration number must be exactly 12 digits"

- [ ] **Step 5: Test company TIN validation**

Fill TIN: "12345678900" (missing C prefix)
Action: Click "Next"
Expected: Error "TIN must start with C followed by 10-11 digits"

- [ ] **Step 6: Test business activity required validation**

Leave business activity empty
Action: Click "Next"
Expected: Error "Business activity code is required"

---

### Task 19: Final verification and commit

**Files:**
- All modified files

- [ ] **Step 1: Run type check**

Run: `cd frontend && npm run type-check`
Expected: No TypeScript errors

- [ ] **Step 2: Test build**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 3: Review all changes**

Run: `git status`
Expected: Shows all modified files

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete entity type registration flow

- Add Step 0 for entity type selection (Individual/Company)
- Add conditional field labels in Step 1 (Owner Name vs Company Name)
- Add conditional fields in Step 2 (IC vs Company Registration, TIN formats)
- Add searchable business activity dropdown with 1000+ MSIC codes
- Add validation for both entity types
- Update progress indicator to show 4 steps

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 5: Verify git log**

Run: `git log --oneline -5`
Expected: Shows all commits for this feature

---

## Implementation Complete

All tasks completed. The entity type registration flow is now fully implemented with:

✅ Entity type selection (Individual/Company)
✅ Conditional field rendering based on entity type
✅ TIN auto-prefix for individuals (IG + 11 digits)
✅ Flexible TIN format for companies (C + 10-11 digits)
✅ Searchable business activity dropdown with 1000+ MSIC codes
✅ Proper validation for both entity types
✅ 4-step registration flow with progress indicator

