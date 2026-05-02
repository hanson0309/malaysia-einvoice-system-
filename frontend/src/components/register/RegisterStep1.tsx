import { useState } from 'react';

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
