import { useState } from 'react';

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
  { code: '01', name: 'Johor' },
  { code: '02', name: 'Kedah' },
  { code: '03', name: 'Kelantan' },
  { code: '14', name: 'Kuala Lumpur' },
  { code: '15', name: 'Labuan' },
  { code: '04', name: 'Melaka' },
  { code: '05', name: 'Negeri Sembilan' },
  { code: '06', name: 'Pahang' },
  { code: '16', name: 'Putrajaya' },
  { code: '09', name: 'Perlis' },
  { code: '07', name: 'Penang' },
  { code: '08', name: 'Perak' },
  { code: '12', name: 'Sabah' },
  { code: '10', name: 'Selangor' },
  { code: '13', name: 'Sarawak' },
  { code: '11', name: 'Terengganu' },
];

export default function RegisterStep3({
  formData,
  onChange,
  onSubmit,
  onBack,
  isLoading,
}: RegisterStep3Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length > 20) {
      newErrors.phone = 'Phone number must be 20 characters or less';
    }

    if (!formData.address_line1.trim()) {
      newErrors.address_line1 = 'Address line 1 is required';
    } else if (formData.address_line1.length > 200) {
      newErrors.address_line1 = 'Address line 1 must be 200 characters or less';
    }

    if (formData.address_line2 && formData.address_line2.length > 200) {
      newErrors.address_line2 = 'Address line 2 must be 200 characters or less';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.city.length > 100) {
      newErrors.city = 'City must be 100 characters or less';
    }

    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    } else if (formData.postcode.length > 10) {
      newErrors.postcode = 'Postcode must be 10 characters or less';
    }

    if (!formData.state_code) {
      newErrors.state_code = 'State is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    onChange(field, value);
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
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
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            disabled={isLoading}
          />
          <div className="input-underline"></div>
        </div>
        {errors.phone && (
          <div className="field-error">
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
            placeholder="Street address, building name"
            value={formData.address_line1}
            onChange={(e) => handleInputChange('address_line1', e.target.value)}
            disabled={isLoading}
          />
          <div className="input-underline"></div>
        </div>
        {errors.address_line1 && (
          <div className="field-error">
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
            placeholder="Apartment, suite, unit, etc."
            value={formData.address_line2}
            onChange={(e) => handleInputChange('address_line2', e.target.value)}
            disabled={isLoading}
          />
          <div className="input-underline"></div>
        </div>
        {errors.address_line2 && (
          <div className="field-error">
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
            placeholder="Enter your city"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            disabled={isLoading}
          />
          <div className="input-underline"></div>
        </div>
        {errors.city && (
          <div className="field-error">
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
            placeholder="Enter your postcode"
            value={formData.postcode}
            onChange={(e) => handleInputChange('postcode', e.target.value)}
            disabled={isLoading}
          />
          <div className="input-underline"></div>
        </div>
        {errors.postcode && (
          <div className="field-error">
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
          <div className="input-underline"></div>
        </div>
        {errors.state_code && (
          <div className="field-error">
            {errors.state_code}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
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
