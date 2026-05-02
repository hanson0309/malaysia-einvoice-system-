import { useState } from 'react';

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
      newErrors.company_registration_no = 'Company registration number must be 50 characters or less';
    }

    if (!formData.tin_number.trim()) {
      newErrors.tin_number = 'TIN number is required';
    } else if (!/^\d{12}$/.test(formData.tin_number)) {
      newErrors.tin_number = 'TIN number must be exactly 12 digits';
    }

    if (!formData.business_activity_code.trim()) {
      newErrors.business_activity_code = 'Business activity code is required';
    } else if (formData.business_activity_code.length > 10) {
      newErrors.business_activity_code = 'Business activity code must be 10 characters or less';
    }

    if (formData.sst_registration_no && formData.sst_registration_no.length > 50) {
      newErrors.sst_registration_no = 'SST registration number must be 50 characters or less';
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
            placeholder="202301234567"
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

      <div className="form-group">
        <label className="form-label" htmlFor="tin_number">
          TIN Number
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            id="tin_number"
            className="form-input"
            placeholder="123456789012"
            maxLength={12}
            value={formData.tin_number}
            onChange={(e) => handleInputChange('tin_number', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.tin_number && (
          <div className="field-error">
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
            placeholder="46510"
            value={formData.business_activity_code}
            onChange={(e) => handleInputChange('business_activity_code', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.business_activity_code && (
          <div className="field-error">
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
            placeholder="A01-2345-67890123"
            value={formData.sst_registration_no}
            onChange={(e) => handleInputChange('sst_registration_no', e.target.value)}
          />
          <div className="input-underline"></div>
        </div>
        {errors.sst_registration_no && (
          <div className="field-error">
            {errors.sst_registration_no}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
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
