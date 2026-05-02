# Multi-Step Registration Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 3-step registration wizard that collects all required backend fields (company details, TIN, address) to fix the registration API validation failure.

**Architecture:** Client-side state management in RegisterPage container, three step components for form sections, progress indicator, submit all data atomically on final step.

**Tech Stack:** React, TypeScript, Framer Motion, existing login.css styling

---

## File Structure

**New Files:**
- `frontend/src/components/register/ProgressIndicator.tsx` - Visual progress bar (1/3, 2/3, 3/3)
- `frontend/src/components/register/RegisterStep1.tsx` - Basic info (company, email, password)
- `frontend/src/components/register/RegisterStep2.tsx` - Company details (registration no, TIN, business code)
- `frontend/src/components/register/RegisterStep3.tsx` - Address & contact (phone, address, city, state)

**Modified Files:**
- `frontend/src/pages/RegisterPage.tsx` - Convert to multi-step container
- `frontend/src/lib/api.ts` - Update authApi.register() signature
- `frontend/src/contexts/AuthContext.tsx` - Update register() signature

---

### Task 1: Create ProgressIndicator Component

**Files:**
- Create: `frontend/src/components/register/ProgressIndicator.tsx`

- [ ] **Step 1: Create component directory**

```bash
mkdir -p frontend/src/components/register
```

- [ ] **Step 2: Write ProgressIndicator component**

```typescript
import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '1rem',
        color: 'var(--gray)',
        fontSize: '0.875rem'
      }}>
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div style={{
        width: '100%',
        height: '4px',
        background: 'var(--navy-mid)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--gold-dark), var(--gold))',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/register/ProgressIndicator.tsx
git commit -m "feat: add progress indicator component for multi-step registration"
```

### Task 2: Create RegisterStep1 Component

**Files:**
- Create: `frontend/src/components/register/RegisterStep1.tsx`

- [ ] **Step 1: Write RegisterStep1 component with validation**

```typescript
import React, { useState } from 'react';

interface RegisterStep1Props {
  formData: {
    company_name: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}

export default function RegisterStep1({ formData, onChange, onNext }: RegisterStep1Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    } else if (formData.company_name.length > 200) {
      newErrors.company_name = 'Company name must be 200 characters or less';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (formData.email.length > 100) {
      newErrors.email = 'Email must be 100 characters or less';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (formData.password.length > 100) {
      newErrors.password = 'Password must be 100 characters or less';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label" htmlFor="company_name">
          Company Name
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="company_name"
            className="form-input"
            placeholder="Your Company Ltd"
            value={formData.company_name}
            onChange={(e) => onChange('company_name', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.company_name && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.company_name}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email">
          Email Address
        </label>
        <div className="input-wrapper">
          <input
            type="email"
            id="email"
            className="form-input"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.email && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.email}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <div className="input-wrapper">
          <input
            type="password"
            id="password"
            className="form-input"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => onChange('password', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.password && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.password}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="confirmPassword">
          Confirm Password
        </label>
        <div className="input-wrapper">
          <input
            type="password"
            id="confirmPassword"
            className="form-input"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => onChange('confirmPassword', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.confirmPassword && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.confirmPassword}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/register/RegisterStep1.tsx
git commit -m "feat: add step 1 component for basic registration info"
```

### Task 3: Create RegisterStep2 Component

**Files:**
- Create: `frontend/src/components/register/RegisterStep2.tsx`

- [ ] **Step 1: Write RegisterStep2 component with validation**

```typescript
import React, { useState } from 'react';

interface RegisterStep2Props {
  formData: {
    company_registration_no: string;
    tin_number: string;
    business_activity_code: string;
    sst_registration_no: string;
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function RegisterStep2({ formData, onChange, onNext, onBack }: RegisterStep2Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_registration_no.trim()) {
      newErrors.company_registration_no = 'Company registration number is required';
    } else if (formData.company_registration_no.length > 50) {
      newErrors.company_registration_no = 'Must be 50 characters or less';
    }

    if (!formData.tin_number.trim()) {
      newErrors.tin_number = 'TIN number is required';
    } else if (!/^\d{12}$/.test(formData.tin_number)) {
      newErrors.tin_number = 'TIN must be exactly 12 digits';
    }

    if (!formData.business_activity_code.trim()) {
      newErrors.business_activity_code = 'Business activity code is required';
    } else if (formData.business_activity_code.length > 10) {
      newErrors.business_activity_code = 'Must be 10 characters or less';
    }

    if (formData.sst_registration_no && formData.sst_registration_no.length > 50) {
      newErrors.sst_registration_no = 'Must be 50 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label" htmlFor="company_registration_no">
          Company Registration Number
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="company_registration_no"
            className="form-input"
            placeholder="e.g., 202301234567"
            value={formData.company_registration_no}
            onChange={(e) => onChange('company_registration_no', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.company_registration_no && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.company_registration_no}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="tin_number">
          TIN Number (12 digits)
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="tin_number"
            className="form-input"
            placeholder="123456789012"
            value={formData.tin_number}
            onChange={(e) => onChange('tin_number', e.target.value)}
            maxLength={12}
          />
          <div className="input-underline"></div>
        </div>
        {errors.tin_number && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.tin_number}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="business_activity_code">
          Business Activity Code
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="business_activity_code"
            className="form-input"
            placeholder="e.g., 62011"
            value={formData.business_activity_code}
            onChange={(e) => onChange('business_activity_code', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.business_activity_code && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.business_activity_code}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="sst_registration_no">
          SST Registration Number (Optional)
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="sst_registration_no"
            className="form-input"
            placeholder="Optional"
            value={formData.sst_registration_no}
            onChange={(e) => onChange('sst_registration_no', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.sst_registration_no && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.sst_registration_no}
          </div>
        )}
      </div>

      <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={onBack}
          style={{ background: 'var(--navy-mid)', color: 'var(--gray)' }}
        >
          Back
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/register/RegisterStep2.tsx
git commit -m "feat: add step 2 component for company details"
```

### Task 4: Create RegisterStep3 Component

**Files:**
- Create: `frontend/src/components/register/RegisterStep3.tsx`

- [ ] **Step 1: Write RegisterStep3 component with Malaysian states**

```typescript
import React, { useState } from 'react';

interface RegisterStep3Props {
  formData: {
    phone: string;
    address_line1: string;
    address_line2: string;
    city: string;
    postcode: string;
    state_code: string;
  };
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const MALAYSIAN_STATES = [
  { code: 'JHR', name: 'Johor' },
  { code: 'KDH', name: 'Kedah' },
  { code: 'KTN', name: 'Kelantan' },
  { code: 'KUL', name: 'Kuala Lumpur' },
  { code: 'LBN', name: 'Labuan' },
  { code: 'MLK', name: 'Melaka' },
  { code: 'NSN', name: 'Negeri Sembilan' },
  { code: 'PHG', name: 'Pahang' },
  { code: 'PJY', name: 'Putrajaya' },
  { code: 'PLS', name: 'Perlis' },
  { code: 'PNG', name: 'Penang' },
  { code: 'PRK', name: 'Perak' },
  { code: 'SBH', name: 'Sabah' },
  { code: 'SGR', name: 'Selangor' },
  { code: 'SWK', name: 'Sarawak' },
  { code: 'TRG', name: 'Terengganu' },
];

export default function RegisterStep3({ formData, onChange, onSubmit, onBack, isLoading }: RegisterStep3Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length > 20) {
      newErrors.phone = 'Must be 20 characters or less';
    }

    if (!formData.address_line1.trim()) {
      newErrors.address_line1 = 'Address is required';
    } else if (formData.address_line1.length > 200) {
      newErrors.address_line1 = 'Must be 200 characters or less';
    }

    if (formData.address_line2 && formData.address_line2.length > 200) {
      newErrors.address_line2 = 'Must be 200 characters or less';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.city.length > 100) {
      newErrors.city = 'Must be 100 characters or less';
    }

    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    } else if (formData.postcode.length > 10) {
      newErrors.postcode = 'Must be 10 characters or less';
    }

    if (!formData.state_code) {
      newErrors.state_code = 'State is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit();
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label" htmlFor="phone">
          Phone Number
        </label>
        <div className="input-wrapper">
          <input
            type="tel"
            id="phone"
            className="form-input"
            placeholder="+60123456789"
            value={formData.phone}
            onChange={(e) => onChange('phone', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.phone && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.phone}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="address_line1">
          Address Line 1
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="address_line1"
            className="form-input"
            placeholder="Street address"
            value={formData.address_line1}
            onChange={(e) => onChange('address_line1', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.address_line1 && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.address_line1}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="address_line2">
          Address Line 2 (Optional)
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="address_line2"
            className="form-input"
            placeholder="Apartment, suite, etc."
            value={formData.address_line2}
            onChange={(e) => onChange('address_line2', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.address_line2 && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.address_line2}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="city">
          City
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="city"
            className="form-input"
            placeholder="City"
            value={formData.city}
            onChange={(e) => onChange('city', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.city && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.city}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="postcode">
          Postcode
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="postcode"
            className="form-input"
            placeholder="12345"
            value={formData.postcode}
            onChange={(e) => onChange('postcode', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.postcode && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.postcode}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="state_code">
          State
        </label>
        <div className="input-wrapper">
          <select
            id="state_code"
            className="form-input"
            value={formData.state_code}
            onChange={(e) => onChange('state_code', e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            <option value="">Select a state</option>
            {MALAYSIAN_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
          <div className="input-underline"></div>
        </div>
        {errors.state_code && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {errors.state_code}
          </div>
        )}
      </div>

      <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={onBack}
          style={{ background: 'var(--navy-mid)', color: 'var(--gray)' }}
          disabled={isLoading}
        >
          Back
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/register/RegisterStep3.tsx
git commit -m "feat: add step 3 component for address and contact details"
```

### Task 5: Update API Types and Signature

**Files:**
- Modify: `frontend/src/lib/api.ts:41-42`

- [ ] **Step 1: Update authApi.register() signature**

Replace the existing register function with:

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
}) => api.post('/auth/register', data),
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: update register API to accept all required fields"
```

---

### Task 6: Update AuthContext

**Files:**
- Modify: `frontend/src/contexts/AuthContext.tsx:14,54-68`

- [ ] **Step 1: Update AuthContext interface**

Replace line 14:

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
}) => Promise<void>;
```

- [ ] **Step 2: Update register function implementation**

Replace lines 54-68:

```typescript
const register = async (data: {
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
}) => {
  try {
    const response = await authApi.register(data);
    const { access_token, refresh_token, user } = response.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('refreshToken', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));

    setToken(access_token);
    setUser(user);
  } catch (error) {
    throw error;
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/contexts/AuthContext.tsx
git commit -m "feat: update AuthContext register to accept complete registration data"
```

### Task 7: Refactor RegisterPage to Multi-Step Container

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Update imports and add step components**

Replace lines 1-6:

```typescript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import '../styles/login.css';
import ProgressIndicator from '../components/register/ProgressIndicator';
import RegisterStep1 from '../components/register/RegisterStep1';
import RegisterStep2 from '../components/register/RegisterStep2';
import RegisterStep3 from '../components/register/RegisterStep3';
```

- [ ] **Step 2: Update state to include all form fields and current step**

Replace lines 8-12:

```typescript
const [currentStep, setCurrentStep] = useState(1);
const [formData, setFormData] = useState({
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
const [error, setError] = useState('');
const [isLoading, setIsLoading] = useState(false);
const { register } = useAuth();
const navigate = useNavigate();
```

- [ ] **Step 3: Add field change handler**

Add after state declarations:

```typescript
const handleFieldChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

- [ ] **Step 4: Add step navigation handlers**

Add after handleFieldChange:

```typescript
const handleNext = () => {
  setCurrentStep(prev => prev + 1);
};

const handleBack = () => {
  setCurrentStep(prev => prev - 1);
};
```

- [ ] **Step 5: Update handleSubmit to use complete form data**

Replace lines 16-29:

```typescript
const handleSubmit = async () => {
  setError('');
  setIsLoading(true);

  try {
    const { confirmPassword, ...registrationData } = formData;
    await register(registrationData);
    navigate('/dashboard');
  } catch (err: any) {
    setError(err.response?.data?.message || 'Registration failed. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 6: Update form rendering to show current step**

Replace the form section (lines 97-173) with:

```typescript
<form onSubmit={(e) => e.preventDefault()}>
  {error && (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="error-message"
    >
      {error}
    </motion.div>
  )}

  <ProgressIndicator currentStep={currentStep} totalSteps={3} />

  {currentStep === 1 && (
    <RegisterStep1
      formData={{
        company_name: formData.company_name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      }}
      onChange={handleFieldChange}
      onNext={handleNext}
    />
  )}

  {currentStep === 2 && (
    <RegisterStep2
      formData={{
        company_registration_no: formData.company_registration_no,
        tin_number: formData.tin_number,
        business_activity_code: formData.business_activity_code,
        sst_registration_no: formData.sst_registration_no
      }}
      onChange={handleFieldChange}
      onNext={handleNext}
      onBack={handleBack}
    />
  )}

  {currentStep === 3 && (
    <RegisterStep3
      formData={{
        phone: formData.phone,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        postcode: formData.postcode,
        state_code: formData.state_code
      }}
      onChange={handleFieldChange}
      onSubmit={handleSubmit}
      onBack={handleBack}
      isLoading={isLoading}
    />
  )}
</form>
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/RegisterPage.tsx
git commit -m "feat: convert RegisterPage to multi-step wizard"
```

---

### Task 8: Manual Testing

**Files:**
- Test: Frontend registration flow

- [ ] **Step 1: Start development server**

```bash
cd frontend
npm run dev
```

Expected: Server starts on http://localhost:5173

- [ ] **Step 2: Navigate to registration page**

Open browser to http://localhost:5173/register

Expected: See Step 1 form with progress indicator showing "Step 1 of 3"

- [ ] **Step 3: Test Step 1 validation**

Try clicking "Next" without filling fields.

Expected: Validation errors appear below each field

- [ ] **Step 4: Fill Step 1 and proceed**

Fill in:
- Company name: "Test Company"
- Email: "test@example.com"
- Password: "password123"
- Confirm password: "password123"

Click "Next"

Expected: Progress indicator shows "Step 2 of 3", Step 2 form appears

- [ ] **Step 5: Test Step 2 TIN validation**

Enter TIN with less than 12 digits, click "Next"

Expected: Error "TIN must be exactly 12 digits"

- [ ] **Step 6: Fill Step 2 and proceed**

Fill in:
- Company registration: "202301234567"
- TIN: "123456789012"
- Business activity code: "62011"
- SST (optional): leave blank

Click "Next"

Expected: Progress indicator shows "Step 3 of 3", Step 3 form appears

- [ ] **Step 7: Test back navigation**

Click "Back" button

Expected: Returns to Step 2 with all data preserved

Click "Next" to return to Step 3

Expected: Returns to Step 3 with all data preserved

- [ ] **Step 8: Fill Step 3 and submit**

Fill in:
- Phone: "+60123456789"
- Address line 1: "123 Test Street"
- City: "Kuala Lumpur"
- Postcode: "50000"
- State: Select "Kuala Lumpur"

Click "Create Account"

Expected: Registration succeeds, redirects to dashboard

- [ ] **Step 9: Verify backend received correct data**

Check backend logs or database

Expected: Tenant and User created with all fields populated correctly

- [ ] **Step 10: Test mobile responsive layout**

Resize browser to mobile width (< 640px)

Expected: Form remains usable, progress indicator visible, buttons stack properly

---

### Task 9: Final Commit and Summary

**Files:**
- All modified files

- [ ] **Step 1: Run final verification**

```bash
cd frontend
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 2: Create final commit if any fixes were needed**

```bash
git add .
git commit -m "fix: address any issues found during testing"
```

- [ ] **Step 3: Verify git status is clean**

```bash
git status
```

Expected: All changes committed

---

## Success Criteria Checklist

- [ ] Step 1 validates company name, email, password, and password confirmation
- [ ] Step 2 validates TIN as exactly 12 digits
- [ ] Step 3 shows Malaysian state dropdown with all 16 states
- [ ] Back button preserves all entered data
- [ ] Complete registration creates tenant and user in database
- [ ] Backend validation errors display at top of current step
- [ ] Progress indicator updates correctly (1/3, 2/3, 3/3)
- [ ] Mobile responsive layout works on small screens
- [ ] Registration succeeds and redirects to dashboard
- [ ] All form data matches backend schema (snake_case field names)

