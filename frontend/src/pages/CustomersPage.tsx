import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Mail, Phone, MapPin, Search } from 'lucide-react';
import { customerApi } from '../lib/api';
import '../styles/elegant-theme.css';

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
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await customerApi.getAll();
      setCustomers(response.data.data || []);
    } catch (err) {
      setError('Failed to load customers');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await customerApi.delete(deleteConfirm.id);
      setCustomers(customers.filter(c => c._id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete customer');
      console.error(err);
      setDeleteConfirm(null);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="elegant-loading">
        <motion.div
          className="elegant-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="elegant-page">
      {/* Header */}
      <motion.div
        className="elegant-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="elegant-header-content">
          <div className="elegant-header-text">
            <motion.h1
              className="elegant-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Customers
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'} in directory
            </motion.p>
          </div>

          <motion.button
            onClick={() => navigate('/dashboard/customers/new')}
            className="elegant-btn elegant-btn-primary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>New Customer</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        className="elegant-toolbar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="elegant-search-container">
          <Search className="elegant-search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="elegant-search-input"
          />
        </div>
      </motion.div>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '2px',
            color: '#f87171',
            marginBottom: '2rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {error}
        </motion.div>
      )}

      {/* Customer grid */}
      <AnimatePresence mode="wait">
        {filteredCustomers.length === 0 ? (
          <motion.div
            className="elegant-empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="elegant-empty-icon">👥</div>
            <h3 className="elegant-empty-title">No customers found</h3>
            <p className="elegant-empty-description">
              {searchQuery ? 'Try adjusting your search criteria' : 'Start by adding your first customer'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.5rem',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {filteredCustomers.map((customer, index) => (
              <motion.div
                key={customer._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="elegant-card"
                style={{ padding: '1.75rem' }}
                whileHover={{ y: -4, borderColor: 'rgba(139, 92, 246, 0.3)' }}
              >
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.5rem',
                      fontWeight: 500,
                      color: 'var(--elegant-text-primary)',
                      marginBottom: '1rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {customer.name}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {customer.email && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          color: 'var(--elegant-text-muted)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <Mail size={16} style={{ flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-sans)' }}>{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          color: 'var(--elegant-text-muted)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <Phone size={16} style={{ flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-sans)' }}>{customer.phone}</span>
                      </div>
                    )}
                    {customer.address_line1 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.625rem',
                          color: 'var(--elegant-text-muted)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <MapPin size={16} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                        <span style={{ fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                          {[customer.address_line1, customer.city, customer.state_code].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <motion.button
                    onClick={() => navigate(`/dashboard/customers/${customer._id}/edit`)}
                    className="elegant-btn elegant-btn-secondary"
                    style={{ flex: 1, fontSize: '0.8125rem', padding: '0.625rem 1rem' }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </motion.button>
                  <motion.button
                    onClick={() => handleDelete(customer._id, customer.name)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 1rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sharp)',
                      color: 'var(--elegant-accent-red-light)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    whileHover={{
                      y: -2,
                      background: 'rgba(239, 68, 68, 0.15)',
                      borderColor: 'rgba(239, 68, 68, 0.5)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1rem',
            }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="elegant-card"
              style={{
                maxWidth: '440px',
                width: '100%',
                padding: '2rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.75rem',
                  fontWeight: 500,
                  color: 'var(--elegant-text-primary)',
                  marginBottom: '1rem',
                }}
              >
                Delete Customer
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--elegant-text-muted)',
                  marginBottom: '2rem',
                  lineHeight: 1.6,
                }}
              >
                Are you sure you want to delete <strong style={{ color: 'var(--elegant-text-primary)' }}>"{deleteConfirm.name}"</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <motion.button
                  onClick={() => setDeleteConfirm(null)}
                  className="elegant-btn elegant-btn-secondary"
                  style={{ flex: 1 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={confirmDelete}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.625rem',
                    padding: '0.875rem 1.75rem',
                    background: 'linear-gradient(135deg, var(--elegant-accent-red) 0%, #dc2626 100%)',
                    color: 'var(--elegant-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    border: 'none',
                    borderRadius: 'var(--radius-sharp)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
