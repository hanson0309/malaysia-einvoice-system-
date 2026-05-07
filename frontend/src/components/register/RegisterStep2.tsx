import { useState, useEffect } from 'react';
import Select from 'react-select';
import type { MSICCode, MSICOption } from '../../types/msic';

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

export default function RegisterStep2({ formData, entity_type, onChange, onNext, onBack }: RegisterStep2Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msicOptions, setMsicOptions] = useState<MSICOption[]>([]);
  const [isLoadingMsic, setIsLoadingMsic] = useState(true);

  useEffect(() => {
    const loadMsicData = async () => {
      try {
        const response = await fetch('/msic.json');
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Ensure entity_type is set (should be set in Step 0)
    if (!entity_type) {
      // This shouldn't happen in normal flow, but handle gracefully
      newErrors.company_registration_no = 'Please select entity type first';
      setErrors(newErrors);
      return false;
    }

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
      // Individual: Malaysian IC format YYMMDD-PB-####
      if (!/^\d{6}-\d{2}-\d{4}$/.test(formData.company_registration_no)) {
        newErrors.company_registration_no = 'Please enter a valid IC number (format: YYMMDD-PB-####)';
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

  const regNumberLabel = entity_type === 'individual' ? 'IC Number (NRIC)' : 'Company Registration Number';
  const regNumberPlaceholder = entity_type === 'individual' ? '990101-01-1234' : '202301234567';

  const tinLabel = 'TIN Number';
  const tinPlaceholder = entity_type === 'individual' ? '12345678901' : 'C12345678900';
  const tinHelperText = entity_type === 'individual'
    ? 'TIN will be formatted as IG + 11 digits'
    : 'Format: C followed by 10-11 digits';

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

  const handleBusinessActivityChange = (selectedOption: MSICOption | null) => {
    handleInputChange('business_activity_code', selectedOption?.value || '');
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
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={{
              control: (base) => ({
                ...base,
                background: 'var(--navy-deep)',
                backgroundColor: 'var(--navy-deep)',
                borderColor: 'var(--navy-mid)',
                borderRadius: '4px',
                minHeight: '48px',
                '&:hover': {
                  borderColor: 'var(--gold)'
                }
              }),
              menuPortal: (base) => ({
                ...base,
                zIndex: 99999
              }),
              menuList: (base) => ({
                ...base,
                background: 'var(--navy-deep)',
                backgroundColor: 'var(--navy-deep)',
                padding: 0
              }),
              menu: (base) => ({
                ...base,
                background: 'var(--navy-deep)',
                backgroundColor: 'var(--navy-deep)',
                border: '1px solid var(--navy-mid)',
                opacity: 1,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
              }),
              option: (base, state) => ({
                ...base,
                background: state.isFocused ? 'var(--navy-mid)' : 'var(--navy-deep)',
                backgroundColor: state.isFocused ? 'var(--navy-mid)' : 'var(--navy-deep)',
                color: 'var(--white)',
                cursor: 'pointer',
                opacity: 1,
                '&:hover': {
                  background: 'var(--navy-mid)',
                  backgroundColor: 'var(--navy-mid)'
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

      <div className="form-actions" style={{ position: 'relative', zIndex: 1 }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
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
