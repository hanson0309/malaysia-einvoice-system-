import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { customerApi } from '../lib/api';

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  state_code?: string;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await customerApi.getAll();
      setCustomers(response.data);
    } catch (err) {
      setError('Failed to load customers');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"?`)) return;

    try {
      await customerApi.delete(id);
      setCustomers(customers.filter(c => c._id !== id));
    } catch (err) {
      alert('Failed to delete customer');
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9' }}>Customers</h1>
        <motion.button
          onClick={() => navigate('/dashboard/customers/new')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            border: 'none',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus style={{ width: '20px', height: '20px' }} />
          Add Customer
        </motion.button>
      </div>

      {/* Loading/Error states */}
      {isLoading && <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}
      {error && <div style={{ textAlign: 'center', color: '#ef4444' }}>{error}</div>}

      {/* Customer grid */}
      {!isLoading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {customers.map((customer, index) => (
            <motion.div
              key={customer._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{
                padding: '1.5rem',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                  {customer.name}
                </h3>
                {customer.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <Mail style={{ width: '16px', height: '16px' }} />
                    {customer.email}
                  </div>
                )}
                {customer.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <Phone style={{ width: '16px', height: '16px' }} />
                    {customer.phone}
                  </div>
                )}
                {customer.address_line1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    <MapPin style={{ width: '16px', height: '16px' }} />
                    {customer.address_line1}, {customer.city} {customer.state_code}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <motion.button
                  onClick={() => navigate(`/dashboard/customers/${customer._id}/edit`)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#8b5cf6',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Edit style={{ width: '16px', height: '16px' }} />
                  Edit
                </motion.button>
                <motion.button
                  onClick={() => handleDelete(customer._id, customer.name)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                  Delete
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && customers.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '4rem' }}>
          No customers yet. Click "Add Customer" to create one.
        </div>
      )}
    </div>
  );
}
