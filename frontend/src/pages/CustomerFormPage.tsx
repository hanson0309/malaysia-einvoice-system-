import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X, User, Building2 } from 'lucide-react';
import { customerApi } from '../lib/api';

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  registration_no: string;
  id_type: 'NRIC' | 'PASSPORT' | 'BRN' | 'ARMY';
  tin_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  state_code: string;
  country_code: string;
  customer_type: 'B2B' | 'B2C';
}

// Reusable input styles
const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '0.5rem',
  background: 'rgba(30, 41, 59, 0.9)',
  border: '1px solid rgba(139, 92, 246, 0.3)',
  color: '#f1f5f9',
  fontSize: '0.875rem',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const inputFocusStyle = {
  ...inputStyle,
  border: '1px solid rgba(139, 92, 246, 0.6)',
  boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.1)',
};

const getRegistrationPlaceholder = (idType: string) => {
  switch (idType) {
    case 'NRIC': return 'e.g., 901234-56-7890';
    case 'PASSPORT': return 'e.g., A12345678';
    case 'BRN': return 'e.g., 202301234567';
    case 'ARMY': return 'e.g., T1234567';
    default: return '';
  }
};

export default function CustomerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    registration_no: '',
    id_type: 'NRIC',
    tin_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    state_code: '',
    country_code: 'MY',
    customer_type: 'B2C',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      loadCustomer(id);
    }
  }, [isEdit, id]);

  const loadCustomer = async (customerId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await customerApi.getById(customerId);
      setFormData(response.data);
    } catch (err) {
      setError('Failed to load customer');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Customer name is required');
      return;
    }

    // Email validation
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address (e.g., customer@example.com)');
        return;
      }
    }

    // Phone validation (Malaysian format)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^(\+60|0)[0-9]{8,10}$/;
      if (!phoneRegex.test(formData.phone.replace(/[\s-]/g, ''))) {
        setError('Please enter a valid Malaysian phone number (e.g., +60123456789 or 0123456789)');
        return;
      }
    }

    // TIN validation (basic format check)
    if (formData.tin && formData.tin.trim()) {
      const tinRegex = /^[A-Z0-9]{10,20}$/;
      if (!tinRegex.test(formData.tin)) {
        setError('Please enter a valid TIN (10-20 alphanumeric characters)');
        return;
      }
    }

    try {
      setIsSaving(true);
      setError(null);

      if (isEdit && id) {
        await customerApi.update(id, formData);
      } else {
        await customerApi.create(formData);
      }

      navigate('/dashboard/customers');
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to save customer'
        : 'Failed to save customer';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
          {isEdit ? 'Edit Customer' : 'New Customer'}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          {isEdit ? 'Update customer information' : 'Add a new customer to your account'}
        </p>
      </div>

      {/* Loading state */}
      {isLoading && <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}

      {/* Error display */}
      {error && (
        <div style={{
          padding: '1rem',
          borderRadius: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          marginBottom: '1.5rem',
        }}>
          <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {/* Customer Type Selection */}
      {!isLoading && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
            Customer Type *
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[
              { value: 'B2C', icon: User, label: 'B2C (Individual)', color: '#8b5cf6' },
              { value: 'B2B', icon: Building2, label: 'B2B (Business)', color: '#f59e0b' },
            ].map((type) => {
              const Icon = type.icon;
              const isSelected = formData.customer_type === type.value;
              return (
                <motion.button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, customer_type: type.value as 'B2B' | 'B2C' })}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    background: isSelected ? `${type.color}20` : 'rgba(30, 41, 59, 0.5)',
                    border: `2px solid ${isSelected ? type.color : 'rgba(139, 92, 246, 0.2)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon style={{ width: '24px', height: '24px', color: isSelected ? type.color : '#94a3b8' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? type.color : '#94a3b8' }}>
                    {type.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      {!isLoading && (
        <form onSubmit={handleSubmit}>
          <div style={{
            padding: '2rem',
            borderRadius: '1.5rem',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}>
            {/* Basic Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
                Basic Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="ABC Corporation Sdn Bhd"
                    required
                    style={focusedField === 'name' ? inputFocusStyle : inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Identity Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
                Identity Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    ID Type *
                  </label>
                  <select
                    name="id_type"
                    value={formData.id_type}
                    onChange={(e) => setFormData({ ...formData, id_type: e.target.value as 'NRIC' | 'PASSPORT' | 'BRN' | 'ARMY' })}
                    onFocus={() => setFocusedField('id_type')}
                    onBlur={() => setFocusedField(null)}
                    required
                    style={focusedField === 'id_type' ? inputFocusStyle : inputStyle}
                  >
                    <option value="NRIC">NRIC (Malaysian IC)</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="BRN">BRN (Business Registration)</option>
                    <option value="ARMY">Army ID</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    name="registration_no"
                    value={formData.registration_no}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('registration_no')}
                    onBlur={() => setFocusedField(null)}
                    placeholder={getRegistrationPlaceholder(formData.id_type)}
                    required
                    maxLength={50}
                    style={focusedField === 'registration_no' ? inputFocusStyle : inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
                Contact Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="customer@example.com"
                    style={focusedField === 'email' ? inputFocusStyle : inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="+60123456789"
                    style={focusedField === 'phone' ? inputFocusStyle : inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Tax & Address Information */}
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
                Tax & Address Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    TIN (Tax Identification Number) {formData.customer_type === 'B2B' && '*'}
                  </label>
                  <input
                    type="text"
                    name="tin_number"
                    value={formData.tin_number}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('tin_number')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="C1234567890"
                    required={formData.customer_type === 'B2B'}
                    style={focusedField === 'tin_number' ? inputFocusStyle : inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('address_line1')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="123 Jalan Sultan"
                    style={focusedField === 'address_line1' ? inputFocusStyle : inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('address_line2')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Taman Melawati (optional)"
                    style={focusedField === 'address_line2' ? inputFocusStyle : inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('city')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Kuala Lumpur"
                      style={focusedField === 'city' ? inputFocusStyle : inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                      Postcode
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('postcode')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="50000"
                      style={focusedField === 'postcode' ? inputFocusStyle : inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                      State Code
                    </label>
                    <input
                      type="text"
                      name="state_code"
                      value={formData.state_code}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('state_code')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g., 14 for Kuala Lumpur"
                      style={focusedField === 'state_code' ? inputFocusStyle : inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                      Country Code
                    </label>
                    <input
                      type="text"
                      name="country_code"
                      value={formData.country_code}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('country_code')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="MY"
                      style={focusedField === 'country_code' ? inputFocusStyle : inputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <motion.button
              type="button"
              onClick={() => navigate('/dashboard/customers')}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '0.75rem',
                background: 'rgba(71, 85, 105, 0.5)',
                border: '1px solid rgba(71, 85, 105, 0.3)',
                color: '#94a3b8',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <X style={{ width: '20px', height: '20px' }} />
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '0.75rem',
                background: isSaving
                  ? 'rgba(139, 92, 246, 0.5)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none',
                color: 'white',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              whileHover={!isSaving ? { scale: 1.02 } : {}}
              whileTap={!isSaving ? { scale: 0.98 } : {}}
            >
              <Save style={{ width: '20px', height: '20px' }} />
              {isSaving ? 'Saving...' : 'Save Customer'}
            </motion.button>
          </div>
        </form>
      )}
    </div>
  );
}
