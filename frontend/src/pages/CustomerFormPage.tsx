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
    address: '',
    taxId: '',
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

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            <label htmlFor="email" className="form-field-label form-field-label-required">
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
            <label htmlFor="address" className="form-field-label">
              Address
            </label>
            <textarea
              name="address"
              id="address"
              value={formData.address}
              onChange={handleChange}
              className={`form-field-textarea ${errors.address ? 'form-field-input-error' : ''}`}
              placeholder="Enter customer address"
              disabled={isLoading}
              rows={3}
            />
            {errors.address && (
              <span className="form-field-error">{errors.address}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="taxId" className="form-field-label">
              Registration Number
            </label>
            <input
              type="text"
              name="taxId"
              id="taxId"
              value={formData.taxId}
              onChange={handleChange}
              className={`form-field-input ${errors.taxId ? 'form-field-input-error' : ''}`}
              placeholder="Company registration number"
              disabled={isLoading}
            />
            {errors.taxId && (
              <span className="form-field-error">{errors.taxId}</span>
            )}
            <span className="form-help-text">
              Optional: Business registration or tax identification number
            </span>
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
