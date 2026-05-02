import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerApi } from '../lib/api';
import '../styles/forms.css';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    registration_no: '',
    id_type: 'NRIC' as 'NRIC' | 'PASSPORT' | 'BRN' | 'ARMY',
    tin_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    state_code: '',
    country_code: 'MY',
    customer_type: 'B2C' as 'B2B' | 'B2C',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    setIsFetching(true);
    try {
      const response = await customerApi.getById(id!);
      setFormData(response.data);
    } catch (error) {
      console.error('Failed to load customer:', error);
      setError('Failed to load customer');
    } finally {
      setIsFetching(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Registration number validation
    if (!formData.registration_no.trim()) {
      newErrors.taxId = 'Registration number is required';
    }

    // B2B specific validations
    if (formData.customer_type === 'B2B') {
      if (!formData.tin_number || formData.tin_number.length !== 12) {
        newErrors.taxId = 'TIN number (12 digits) is required for B2B customers';
      }
      if (!formData.address_line1.trim()) {
        newErrors.address = 'Address is required for B2B customers';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isEdit) {
        await customerApi.update(id!, formData);
      } else {
        await customerApi.create(formData);
      }
      navigate('/dashboard/customers');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
  };

  if (isFetching) {
    return (
      <div className="form-page-container">
        <div className="form-card">
          <div className="form-loading">
            <div className="form-loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page-container">
      <div className="form-card">
        <div className="form-header">
          <h1 className="form-title">
            {isEdit ? 'Edit Customer' : 'New Customer'}
          </h1>
          <p className="form-subtitle">
            {isEdit ? 'Update customer information' : 'Add a new customer to your database'}
          </p>
        </div>

        {error && (
          <div className="form-alert form-alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="customer_type" className="form-field-label form-field-label-required">
              Customer Type
            </label>
            <select
              name="customer_type"
              id="customer_type"
              value={formData.customer_type}
              onChange={handleChange}
              className="form-field-input"
              disabled={isLoading}
            >
              <option value="B2C">B2C (Individual)</option>
              <option value="B2B">B2B (Business)</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="name" className="form-field-label form-field-label-required">
              Customer Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className={`form-field-input ${errors.name ? 'form-field-input-error' : ''}`}
              placeholder="Enter customer name"
              disabled={isLoading}
            />
            {errors.name && (
              <span className="form-field-error">{errors.name}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="id_type" className="form-field-label form-field-label-required">
              ID Type
            </label>
            <select
              name="id_type"
              id="id_type"
              value={formData.id_type}
              onChange={handleChange}
              className="form-field-input"
              disabled={isLoading}
            >
              <option value="NRIC">NRIC (Malaysian IC)</option>
              <option value="PASSPORT">Passport</option>
              <option value="BRN">BRN (Business Registration)</option>
              <option value="ARMY">Army ID</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="registration_no" className="form-field-label form-field-label-required">
              Registration Number
            </label>
            <input
              type="text"
              name="registration_no"
              id="registration_no"
              value={formData.registration_no}
              onChange={handleChange}
              className={`form-field-input ${errors.taxId ? 'form-field-input-error' : ''}`}
              placeholder="Enter ID/registration number"
              disabled={isLoading}
            />
            {errors.taxId && (
              <span className="form-field-error">{errors.taxId}</span>
            )}
          </div>

          {formData.customer_type === 'B2B' && (
            <div className="form-field">
              <label htmlFor="tin_number" className="form-field-label form-field-label-required">
                TIN Number
              </label>
              <input
                type="text"
                name="tin_number"
                id="tin_number"
                value={formData.tin_number}
                onChange={handleChange}
                className="form-field-input"
                placeholder="12-digit TIN number"
                maxLength={12}
                disabled={isLoading}
              />
              <span className="form-help-text">
                Tax Identification Number (12 digits, required for B2B)
              </span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="email" className="form-field-label">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-field-input ${errors.email ? 'form-field-input-error' : ''}`}
              placeholder="customer@example.com"
              disabled={isLoading}
            />
            {errors.email && (
              <span className="form-field-error">{errors.email}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="phone" className="form-field-label">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`form-field-input ${errors.phone ? 'form-field-input-error' : ''}`}
              placeholder="+60 12-345 6789"
              disabled={isLoading}
            />
            {errors.phone && (
              <span className="form-field-error">{errors.phone}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="address_line1" className="form-field-label">
              Address Line 1 {formData.customer_type === 'B2B' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              name="address_line1"
              id="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className={`form-field-input ${errors.address ? 'form-field-input-error' : ''}`}
              placeholder="Street address"
              disabled={isLoading}
            />
            {errors.address && (
              <span className="form-field-error">{errors.address}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="address_line2" className="form-field-label">
              Address Line 2
            </label>
            <input
              type="text"
              name="address_line2"
              id="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              className="form-field-input"
              placeholder="Apartment, suite, etc. (optional)"
              disabled={isLoading}
            />
          </div>

          <div className="form-field">
            <label htmlFor="city" className="form-field-label">
              City
            </label>
            <input
              type="text"
              name="city"
              id="city"
              value={formData.city}
              onChange={handleChange}
              className="form-field-input"
              placeholder="City"
              disabled={isLoading}
            />
          </div>

          <div className="form-field">
            <label htmlFor="postcode" className="form-field-label">
              Postcode
            </label>
            <input
              type="text"
              name="postcode"
              id="postcode"
              value={formData.postcode}
              onChange={handleChange}
              className="form-field-input"
              placeholder="Postcode"
              disabled={isLoading}
            />
          </div>

          <div className="form-field">
            <label htmlFor="state_code" className="form-field-label">
              State Code
            </label>
            <input
              type="text"
              name="state_code"
              id="state_code"
              value={formData.state_code}
              onChange={handleChange}
              className="form-field-input"
              placeholder="2-digit state code (e.g., 14 for Kuala Lumpur)"
              maxLength={2}
              disabled={isLoading}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard/customers')}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-form"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
