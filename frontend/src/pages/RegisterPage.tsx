import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import '../styles/login.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(email, password, companyName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Panel - Branding */}
      <motion.div
        className="brand-panel"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="geometric-pattern"></div>

        <motion.div
          className="logo-section"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="logo">
            <span className="logo-accent">MyInvois</span>
          </h1>
          <p className="tagline">Invoice Management System</p>
        </motion.div>

        <motion.div
          className="brand-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h2 className="brand-title">
            Start your journey to<br />effortless invoicing
          </h2>
          <p className="brand-description">
            Join professionals who trust our platform to manage their invoicing with precision, security, and elegance.
          </p>

          <div className="features">
            <div className="feature">
              <div className="feature-icon"></div>
              <span>Secure</span>
            </div>
            <div className="feature">
              <div className="feature-icon"></div>
              <span>Compliant</span>
            </div>
            <div className="feature">
              <div className="feature-icon"></div>
              <span>Professional</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Panel - Form */}
      <div className="form-panel">
        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="form-header">
            <h2 className="form-title">Create Account</h2>
            <p className="form-subtitle">Start managing your invoices professionally</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="error-message"
              >
                {error}
              </motion.div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="companyName">
                Company Name
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="companyName"
                  className="form-input"
                  placeholder="Your Company Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
                <div className="input-underline"></div>
              </div>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="input-underline"></div>
              </div>
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="input-underline"></div>
              </div>
            </div>

            <div className="form-actions">
              <motion.button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </motion.button>
            </div>
          </form>

          <div className="form-footer">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>

          <div className="security-badge">
            <div className="badge-item">
              <div className="badge-dot"></div>
              <span>Secure</span>
            </div>
            <div className="badge-item">
              <div className="badge-dot"></div>
              <span>Compliant</span>
            </div>
            <div className="badge-item">
              <div className="badge-dot"></div>
              <span>Professional</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
