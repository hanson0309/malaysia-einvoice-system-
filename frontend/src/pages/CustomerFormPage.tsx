import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { customerApi } from '../lib/api';

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  tin: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  state_code: string;
  country_code: string;
}

export default function CustomerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    tin: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    state_code: '',
    country_code: 'MY',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#f1f5f9',
                      fontSize: '0.875rem',
                    }}
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
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#f1f5f9',
                      fontSize: '0.875rem',
                    }}
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
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#f1f5f9',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    TIN (Tax ID)
                  </label>
                  <input
                    type="text"
                    name="tin"
                    value={formData.tin}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#f1f5f9',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
                Address Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#f1f5f9',
                      fontSize: '0.875rem',
                    }}
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
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#f1f5f9',
                      fontSize: '0.875rem',
                    }}
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
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(30, 41, 59, 0.9)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#f1f5f9',
                        fontSize: '0.875rem',
                      }}
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
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(30, 41, 59, 0.9)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#f1f5f9',
                        fontSize: '0.875rem',
                      }}
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
                      placeholder="e.g., 14 for Kuala Lumpur"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(30, 41, 59, 0.9)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#f1f5f9',
                        fontSize: '0.875rem',
                      }}
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
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(30, 41, 59, 0.9)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#f1f5f9',
                        fontSize: '0.875rem',
                      }}
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
