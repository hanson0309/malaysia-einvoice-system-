import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Shield, Building } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '0.75rem',
    color: '#f1f5f9',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#cbd5e1',
    marginBottom: '0.5rem',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.5rem',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)',
            borderRadius: '0.75rem'
          }}>
            <User style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
          </div>
          <div>
            <h1 style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              color: '#f1f5f9',
              marginBottom: '0.25rem'
            }}>
              My Profile
            </h1>
            <p style={{ fontSize: '1rem', color: '#94a3b8' }}>
              Manage your account information
            </p>
          </div>
        </div>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          background: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '1.5rem',
          overflow: 'hidden'
        }}
      >
        {/* Profile Header */}
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid rgba(139, 92, 246, 0.3)'
            }}>
              <User style={{ width: '40px', height: '40px', color: 'white' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                {user?.email?.split('@')[0] || 'User'}
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                {user?.email}
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '9999px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981'
                }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
          padding: '0 2rem'
        }}>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              padding: '1rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'info' ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === 'info' ? '#8b5cf6' : '#94a3b8',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Account Information
          </button>
          <button
            onClick={() => setActiveTab('security')}
            style={{
              padding: '1rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'security' ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === 'security' ? '#8b5cf6' : '#94a3b8',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Security
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '2rem' }}>
          {activeTab === 'info' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>
                    <Mail style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <Building style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={user?.company_name || 'Not set'}
                    disabled
                    style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <Calendar style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                    Member Since
                  </label>
                  <input
                    type="text"
                    value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    disabled
                    style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <Shield style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                    Account Status
                  </label>
                  <input
                    type="text"
                    value="Active"
                    disabled
                    style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '0.75rem'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#60a5fa', lineHeight: '1.5' }}>
                  <strong>Note:</strong> To update your account information, please contact support.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                padding: '2rem',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '1rem',
                textAlign: 'center'
              }}>
                <Shield style={{ width: '48px', height: '48px', color: '#8b5cf6', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                  Security Settings
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                  Password management and security features will be available soon.
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#a78bfa' }}>
                    Coming Soon
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
