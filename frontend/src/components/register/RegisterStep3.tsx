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

const RegisterStep3: React.FC<RegisterStep3Props> = ({
  formData,
  onChange,
  onSubmit,
  onBack,
  isLoading,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    onChange(field, value);
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length > 20) {
      newErrors.phone = 'Phone number must not exceed 20 characters';
    }

    // Address line 1 validation
    if (!formData.address_line1.trim()) {
      newErrors.address_line1 = 'Address line 1 is required';
    } else if (formData.address_line1.length > 200) {
      newErrors.address_line1 = 'Address line 1 must not exceed 200 characters';
    }

    // Address line 2 validation (optional)
    if (formData.address_line2 && formData.address_line2.length > 200) {
      newErrors.address_line2 = 'Address line 2 must not exceed 200 characters';
    }

    // City validation
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.city.length > 100) {
      newErrors.city = 'City must not exceed 100 characters';
    }

    // Postcode validation
    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    } else if (formData.postcode.length > 10) {
      newErrors.postcode = 'Postcode must not exceed 10 characters';
    }

    // State validation
    if (!formData.state_code) {
      newErrors.state_code = 'State is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Step 3: Address & Contact</h2>
      <p className="auth-subtitle">Complete your registration with contact details</p>

      <div className="form-group">
        <label htmlFor="phone">Phone Number</label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          disabled={isLoading}
          placeholder="Enter your phone number"
        />
        {errors.phone && <div className="field-error">{errors.phone}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="address_line1">Address Line 1</label>
        <input
          type="text"
          id="address_line1"
          value={formData.address_line1}
          onChange={(e) => handleInputChange('address_line1', e.target.value)}
          disabled={isLoading}
          placeholder="Street address, building name"
        />
        {errors.address_line1 && <div className="field-error">{errors.address_line1}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="address_line2">Address Line 2 (Optional)</label>
        <input
          type="text"
          id="address_line2"
          value={formData.address_line2}
          onChange={(e) => handleInputChange('address_line2', e.target.value)}
          disabled={isLoading}
          placeholder="Apartment, suite, unit, etc."
        />
        {errors.address_line2 && <div className="field-error">{errors.address_line2}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="city">City</label>
        <input
          type="text"
          id="city"
          value={formData.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          disabled={isLoading}
          placeholder="Enter your city"
        />
        {errors.city && <div className="field-error">{errors.city}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="postcode">Postcode</label>
        <input
          type="text"
          id="postcode"
          value={formData.postcode}
          onChange={(e) => handleInputChange('postcode', e.target.value)}
          disabled={isLoading}
          placeholder="Enter your postcode"
        />
        {errors.postcode && <div className="field-error">{errors.postcode}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="state_code">State</label>
        <select
          id="state_code"
          value={formData.state_code}
          onChange={(e) => handleInputChange('state_code', e.target.value)}
          disabled={isLoading}
        >
          <option value="">Select a state</option>
          {MALAYSIAN_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
        {errors.state_code && <div className="field-error">{errors.state_code}</div>}
      </div>

      <div className="button-group">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};

export default RegisterStep3;
