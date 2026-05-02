# MyInvois Application Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire MyInvois application with a hybrid aesthetic - art deco for auth pages, modern functional design for dashboard and data pages.

**Architecture:** Split-screen art deco layout for login/register pages using Cormorant Garamond typography and geometric patterns. Clean, data-focused design for dashboard with DM Sans typography, glass morphism cards, and refined tables. Consistent navy/gold color palette throughout.

**Tech Stack:** React, TypeScript, Tailwind CSS, Framer Motion, Lucide React icons

---

## File Structure

**Styles:**
- `frontend/src/styles/login.css` - Art deco auth page styles (already created)
- `frontend/src/styles/dashboard.css` - Dashboard-specific styles (new)
- `frontend/src/index.css` - Global styles with updated color variables (modify)

**Pages:**
- `frontend/src/pages/LoginPage.tsx` - Already updated with art deco design
- `frontend/src/pages/RegisterPage.tsx` - Needs art deco redesign
- `frontend/src/pages/DashboardPage.tsx` - Needs refinement
- `frontend/src/pages/CustomersPage.tsx` - Needs complete redesign
- `frontend/src/pages/CustomerFormPage.tsx` - Needs complete redesign
- `frontend/src/pages/ProductsPage.tsx` - Needs complete redesign
- `frontend/src/pages/ProductFormPage.tsx` - Needs complete redesign
- `frontend/src/pages/InvoicesPage.tsx` - Needs complete redesign
- `frontend/src/pages/InvoiceFormPage.tsx` - Needs complete redesign
- `frontend/src/pages/InvoiceDetailPage.tsx` - Needs complete redesign

**Components:**
- `frontend/src/components/DashboardLayout.tsx` - Needs refinement
- `frontend/src/components/ProtectedRoute.tsx` - No changes needed

---

### Task 1: Update Global Styles

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Update color variables to match spec**

Update the `:root` section in `frontend/src/index.css`:

```css
:root {
  --navy-deep: #0a1628;
  --navy-mid: #152238;
  --navy-light: #1e2f47;
  --gold: #d4af37;
  --gold-light: #e8c968;
  --gold-dark: #b8941f;
  --cream: #f8f6f0;
  --gray: #8a94a6;
  --white: #ffffff;
  --success: #10b981;
  --error: #ef4444;
  --accent: #6366f1;
  
  /* Legacy aliases for compatibility */
  --color-dark: #0a1628;
  --color-darker: #050508;
  --color-surface: #1a1a24;
  --color-surface-light: #252532;
  --color-gold: #d4af37;
  --color-gold-light: #f4d03f;
  --color-text: #e8e8f0;
  --color-text-muted: #9898a8;
  --color-accent: #6366f1;
  --color-success: #10b981;
  --color-error: #ef4444;
}
```

- [ ] **Step 2: Verify styles compile**

Run: `cd frontend && npm run dev`
Expected: Dev server starts without CSS errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: update global color variables for redesign"
```

### Task 2: Redesign Register Page

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Replace RegisterPage with art deco design**

Replace the entire content of `frontend/src/pages/RegisterPage.tsx`:

```typescript
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
            Join thousands of businesses managing their invoices with elegance and precision.
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
```

- [ ] **Step 2: Test register page in browser**

Navigate to: `http://localhost:5177/register`
Expected: Art deco split-screen layout with animations

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/RegisterPage.tsx
git commit -m "feat: redesign register page with art deco aesthetic"
```

### Task 3: Create Dashboard Styles

**Files:**
- Create: `frontend/src/styles/dashboard.css`

- [ ] **Step 1: Create dashboard CSS file**

Create `frontend/src/styles/dashboard.css`:

```css
/* Dashboard-specific styles */

.dashboard-container {
  padding: 2rem;
}

/* Stats Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(26, 26, 36, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--gold);
  box-shadow: 0 20px 40px rgba(212, 175, 55, 0.2);
}

.stat-card-bg {
  position: absolute;
  top: 0;
  right: 0;
  width: 8rem;
  height: 8rem;
  border-radius: 50%;
  filter: blur(3rem);
  opacity: 0.2;
}

.stat-card-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.stat-icon {
  padding: 0.75rem;
  border-radius: 0.75rem;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--success);
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--cream);
}

.stat-link {
  display: flex;
  align-items: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  gap: 0.25rem;
}

/* Data Tables */
.table-container {
  background: rgba(26, 26, 36, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 1rem;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(212, 175, 55, 0.1);
}

.table-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--cream);
}

.table-subtitle {
  font-size: 0.875rem;
  color: var(--gray);
  margin-top: 0.25rem;
}

.table-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-input {
  padding: 0.75rem 1rem;
  background: var(--navy-mid);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 0.5rem;
  color: var(--cream);
  font-size: 0.875rem;
  transition: all 0.3s ease;
  min-width: 250px;
}

.search-input:focus {
  outline: none;
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: var(--navy-mid);
}

.data-table th {
  padding: 1rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray);
}

.data-table tbody tr {
  border-bottom: 1px solid rgba(212, 175, 55, 0.05);
  transition: background 0.2s ease;
}

.data-table tbody tr:hover {
  background: rgba(212, 175, 55, 0.05);
}

.data-table td {
  padding: 1rem 1.5rem;
  color: var(--cream);
}

.table-actions-cell {
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.data-table tbody tr:hover .table-actions-cell {
  opacity: 1;
}

.action-btn {
  padding: 0.5rem;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  color: var(--gray);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(212, 175, 55, 0.1);
  color: var(--gold);
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
}

/* Status Badges */
.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.draft {
  background: rgba(138, 148, 166, 0.2);
  color: var(--gray);
}

.status-badge.submitted {
  background: rgba(99, 102, 241, 0.2);
  color: var(--accent);
}

.status-badge.validated {
  background: rgba(16, 185, 129, 0.2);
  color: var(--success);
}

.status-badge.rejected {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  color: var(--gray);
  opacity: 0.5;
}

.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--cream);
  margin-bottom: 0.5rem;
}

.empty-state-description {
  color: var(--gray);
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .search-input {
    width: 100%;
  }
  
  .data-table {
    display: block;
    overflow-x: auto;
  }
}
```

- [ ] **Step 2: Verify CSS file created**

Run: `ls frontend/src/styles/dashboard.css`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/dashboard.css
git commit -m "style: add dashboard-specific styles"
```

### Task 4: Redesign Customers Page

**Files:**
- Modify: `frontend/src/pages/CustomersPage.tsx`

- [ ] **Step 1: Replace CustomersPage with clean table design**

Replace the entire content of `frontend/src/pages/CustomersPage.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { customerApi } from '../lib/api';
import '../styles/dashboard.css';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  registrationNumber?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customerApi.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      await customerApi.delete(id);
      setCustomers(customers.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 rounded-full"
          style={{
            borderColor: 'var(--navy-mid)',
            borderTopColor: 'var(--gold)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--cream)' }}>
          Customers
        </h1>
        <p className="text-lg" style={{ color: 'var(--gray)' }}>
          Manage your customer database
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="table-container"
      >
        <div className="table-header">
          <div>
            <h2 className="table-title">All Customers</h2>
            <p className="table-subtitle">{customers.length} total customers</p>
          </div>
          <div className="table-actions">
            <div style={{ position: 'relative' }}>
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--gray)' }}
              />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <Link to="/dashboard/customers/new">
              <motion.button
                className="btn-primary"
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                New Customer
              </motion.button>
            </Link>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <h3 className="empty-state-title">No customers found</h3>
            <p className="empty-state-description">
              {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first customer'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registration Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td style={{ fontWeight: 500 }}>{customer.name}</td>
                  <td style={{ color: 'var(--gray)' }}>{customer.email}</td>
                  <td style={{ color: 'var(--gray)' }}>{customer.phone || '—'}</td>
                  <td style={{ color: 'var(--gray)' }}>{customer.registrationNumber || '—'}</td>
                  <td>
                    <div className="table-actions-cell">
                      <Link to={`/dashboard/customers/${customer.id}/edit`}>
                        <button className="action-btn" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        className="action-btn danger"
                        onClick={() => handleDelete(customer.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Test customers page in browser**

Navigate to: `http://localhost:5177/dashboard/customers`
Expected: Clean table with search, hover effects, action buttons

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/CustomersPage.tsx
git commit -m "feat: redesign customers page with clean table design"
```

### Task 5: Redesign Customer Form Page

**Files:**
- Modify: `frontend/src/pages/CustomerFormPage.tsx`
- Create: `frontend/src/styles/forms.css`

- [ ] **Step 1: Create form styles CSS**

Create `frontend/src/styles/forms.css`:

```css
/* Form Styles */

.form-page-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.form-page-header {
  margin-bottom: 2rem;
}

.form-page-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--cream);
  margin-bottom: 0.5rem;
}

.form-page-subtitle {
  font-size: 1rem;
  color: var(--gray);
}

.form-card {
  background: rgba(26, 26, 36, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 1rem;
  padding: 2rem;
}

.form-field {
  margin-bottom: 1.5rem;
}

.form-field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray);
  margin-bottom: 0.5rem;
}

.form-field-input {
  width: 100%;
  padding: 1rem;
  background: var(--navy-mid);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 0.5rem;
  color: var(--cream);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-field-input:focus {
  outline: none;
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
}

.form-field-input::placeholder {
  color: var(--gray);
  opacity: 0.5;
}

.form-field-textarea {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
}

.form-field-error {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--error);
}

.form-field.error .form-field-input {
  border-color: var(--error);
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-secondary {
  padding: 1rem 1.5rem;
  background: transparent;
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 0.5rem;
  color: var(--gray);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  border-color: var(--gold);
  color: var(--gold);
  background: rgba(212, 175, 55, 0.05);
}

.btn-primary-form {
  flex: 1;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, var(--gold-dark) 0%, var(--gold) 100%);
  border: none;
  border-radius: 0.5rem;
  color: var(--navy-deep);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary-form:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(212, 175, 55, 0.3);
}

.btn-primary-form:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 640px) {
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .btn-secondary {
    width: 100%;
  }
}
```

- [ ] **Step 2: Replace CustomerFormPage component**

Replace the entire content of `frontend/src/pages/CustomerFormPage.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { customerApi } from '../lib/api';
import '../styles/forms.css';

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    registrationNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit && id) {
      loadCustomer(id);
    }
  }, [id, isEdit]);

  const loadCustomer = async (customerId: string) => {
    try {
      const response = await customerApi.getById(customerId);
      setFormData(response.data);
    } catch (error) {
      console.error('Failed to load customer:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      if (isEdit && id) {
        await customerApi.update(id, formData);
      } else {
        await customerApi.create(formData);
      }
      navigate('/dashboard/customers');
    } catch (error: any) {
      console.error('Failed to save customer:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to save customer' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 rounded-full"
          style={{
            borderColor: 'var(--navy-mid)',
            borderTopColor: 'var(--gold)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="form-page-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="form-page-header"
      >
        <h1 className="form-page-title">
          {isEdit ? 'Edit Customer' : 'New Customer'}
        </h1>
        <p className="form-page-subtitle">
          {isEdit ? 'Update customer information' : 'Add a new customer to your database'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="form-card"
      >
        <form onSubmit={handleSubmit}>
          {errors.submit && (
            <div style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.5rem',
              color: 'var(--error)',
              fontSize: '0.875rem'
            }}>
              {errors.submit}
            </div>
          )}

          <div className={`form-field ${errors.name ? 'error' : ''}`}>
            <label htmlFor="name" className="form-field-label">
              Customer Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-field-input"
              placeholder="Acme Corporation"
            />
            {errors.name && <p className="form-field-error">{errors.name}</p>}
          </div>

          <div className={`form-field ${errors.email ? 'error' : ''}`}>
            <label htmlFor="email" className="form-field-label">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-field-input"
              placeholder="contact@acme.com"
            />
            {errors.email && <p className="form-field-error">{errors.email}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="phone" className="form-field-label">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-field-input"
              placeholder="+60 12-345 6789"
            />
          </div>

          <div className="form-field">
            <label htmlFor="address" className="form-field-label">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="form-field-input form-field-textarea"
              placeholder="123 Business Street, Kuala Lumpur"
            />
          </div>

          <div className="form-field">
            <label htmlFor="registrationNumber" className="form-field-label">
              Registration Number
            </label>
            <input
              type="text"
              id="registrationNumber"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              className="form-field-input"
              placeholder="202301234567"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard/customers')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn-primary-form"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Test customer form**

Navigate to: `http://localhost:5177/dashboard/customers/new`
Expected: Clean form with validation, proper styling

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/forms.css frontend/src/pages/CustomerFormPage.tsx
git commit -m "feat: redesign customer form with clean styling and validation"
```

### Task 6: Redesign Products Page

**Files:**
- Modify: `frontend/src/pages/ProductsPage.tsx`

- [ ] **Step 1: Replace ProductsPage with clean table design**

Replace the entire content of `frontend/src/pages/ProductsPage.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { productApi } from '../lib/api';
import '../styles/dashboard.css';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  classificationCode: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productApi.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productApi.delete(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 rounded-full"
          style={{
            borderColor: 'var(--navy-mid)',
            borderTopColor: 'var(--gold)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--cream)' }}>
          Products
        </h1>
        <p className="text-lg" style={{ color: 'var(--gray)' }}>
          Manage your product catalog
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="table-container"
      >
        <div className="table-header">
          <div>
            <h2 className="table-title">All Products</h2>
            <p className="table-subtitle">{products.length} total products</p>
          </div>
          <div className="table-actions">
            <div style={{ position: 'relative' }}>
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--gray)' }}
              />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <Link to="/dashboard/products/new">
              <motion.button
                className="btn-primary"
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                New Product
              </motion.button>
            </Link>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <Package className="empty-state-icon" />
            <h3 className="empty-state-title">No products found</h3>
            <p className="empty-state-description">
              {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first product'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Classification Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td style={{ fontWeight: 500 }}>{product.name}</td>
                  <td style={{ color: 'var(--gray)' }}>
                    {product.description ? (
                      product.description.length > 50
                        ? product.description.substring(0, 50) + '...'
                        : product.description
                    ) : '—'}
                  </td>
                  <td style={{ color: 'var(--gold)', fontWeight: 500 }}>
                    {formatPrice(product.price)}
                  </td>
                  <td style={{ color: 'var(--gray)' }}>{product.classificationCode}</td>
                  <td>
                    <div className="table-actions-cell">
                      <Link to={`/dashboard/products/${product.id}/edit`}>
                        <button className="action-btn" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        className="action-btn danger"
                        onClick={() => handleDelete(product.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Test products page**

Navigate to: `http://localhost:5177/dashboard/products`
Expected: Clean table with formatted prices, search functionality

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ProductsPage.tsx
git commit -m "feat: redesign products page with clean table design"
```

### Task 7: Redesign Product Form Page

**Files:**
- Modify: `frontend/src/pages/ProductFormPage.tsx`

- [ ] **Step 1: Replace ProductFormPage component**

Replace the entire content of `frontend/src/pages/ProductFormPage.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { productApi } from '../lib/api';
import '../styles/forms.css';

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    classificationCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit && id) {
      loadProduct(id);
    }
  }, [id, isEdit]);

  const loadProduct = async (productId: string) => {
    try {
      const response = await productApi.getById(productId);
      setFormData({
        ...response.data,
        price: response.data.price.toString(),
      });
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Price must be a positive number';
    }
    
    if (!formData.classificationCode.trim()) {
      newErrors.classificationCode = 'Classification code is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
      };
      
      if (isEdit && id) {
        await productApi.update(id, payload);
      } else {
        await productApi.create(payload);
      }
      navigate('/dashboard/products');
    } catch (error: any) {
      console.error('Failed to save product:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to save product' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 rounded-full"
          style={{
            borderColor: 'var(--navy-mid)',
            borderTopColor: 'var(--gold)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="form-page-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="form-page-header"
      >
        <h1 className="form-page-title">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h1>
        <p className="form-page-subtitle">
          {isEdit ? 'Update product information' : 'Add a new product to your catalog'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="form-card"
      >
        <form onSubmit={handleSubmit}>
          {errors.submit && (
            <div style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.5rem',
              color: 'var(--error)',
              fontSize: '0.875rem'
            }}>
              {errors.submit}
            </div>
          )}

          <div className={`form-field ${errors.name ? 'error' : ''}`}>
            <label htmlFor="name" className="form-field-label">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-field-input"
              placeholder="Professional Services"
            />
            {errors.name && <p className="form-field-error">{errors.name}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="description" className="form-field-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-field-input form-field-textarea"
              placeholder="Detailed description of the product or service"
            />
          </div>

          <div className={`form-field ${errors.price ? 'error' : ''}`}>
            <label htmlFor="price" className="form-field-label">
              Price (MYR) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="form-field-input"
              placeholder="100.00"
              step="0.01"
              min="0"
            />
            {errors.price && <p className="form-field-error">{errors.price}</p>}
          </div>

          <div className={`form-field ${errors.classificationCode ? 'error' : ''}`}>
            <label htmlFor="classificationCode" className="form-field-label">
              Classification Code *
            </label>
            <input
              type="text"
              id="classificationCode"
              name="classificationCode"
              value={formData.classificationCode}
              onChange={handleChange}
              className="form-field-input"
              placeholder="001"
            />
            {errors.classificationCode && <p className="form-field-error">{errors.classificationCode}</p>}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard/products')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn-primary-form"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Test product form**

Navigate to: `http://localhost:5177/dashboard/products/new`
Expected: Clean form with price validation

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ProductFormPage.tsx
git commit -m "feat: redesign product form with validation"
```

### Task 8: Redesign Invoices Page

**Files:**
- Modify: `frontend/src/pages/InvoicesPage.tsx`

- [ ] **Step 1: Replace InvoicesPage with status badges and filters**

Replace the entire content of `frontend/src/pages/InvoicesPage.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react';
import { invoiceApi } from '../lib/api';
import '../styles/dashboard.css';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  total: number;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const response = await invoiceApi.getAll();
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      await invoiceApi.delete(id);
      setInvoices(invoices.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 rounded-full"
          style={{
            borderColor: 'var(--navy-mid)',
            borderTopColor: 'var(--gold)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--cream)' }}>
          Invoices
        </h1>
        <p className="text-lg" style={{ color: 'var(--gray)' }}>
          Manage and track your invoices
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="table-container"
      >
        <div className="table-header">
          <div>
            <h2 className="table-title">All Invoices</h2>
            <p className="table-subtitle">{invoices.length} total invoices</p>
          </div>
          <div className="table-actions">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--navy-mid)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '0.5rem',
                color: 'var(--cream)',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="validated">Validated</option>
              <option value="rejected">Rejected</option>
            </select>
            <div style={{ position: 'relative' }}>
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--gray)' }}
              />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <Link to="/dashboard/invoices/new">
              <motion.button
                className="btn-primary"
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </motion.button>
            </Link>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <h3 className="empty-state-title">No invoices found</h3>
            <p className="empty-state-description">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Get started by creating your first invoice'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, index) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td style={{ fontWeight: 500 }}>{invoice.invoiceNumber}</td>
                  <td style={{ color: 'var(--gray)' }}>{invoice.customerName}</td>
                  <td style={{ color: 'var(--gray)' }}>{formatDate(invoice.date)}</td>
                  <td style={{ color: 'var(--gold)', fontWeight: 500 }}>
                    {formatPrice(invoice.total)}
                  </td>
                  <td>
                    <span className={`status-badge ${invoice.status}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      <Link to={`/dashboard/invoices/${invoice.id}`}>
                        <button className="action-btn" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                      </Link>
                      {invoice.status === 'draft' && (
                        <Link to={`/dashboard/invoices/${invoice.id}/edit`}>
                          <button className="action-btn" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </Link>
                      )}
                      <button
                        className="action-btn danger"
                        onClick={() => handleDelete(invoice.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Test invoices page**

Navigate to: `http://localhost:5177/dashboard/invoices`
Expected: Table with status badges, status filter dropdown

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/InvoicesPage.tsx
git commit -m "feat: redesign invoices page with status badges and filters"
```

### Task 9: Final Verification and Commit

**Files:**
- All modified files

- [ ] **Step 1: Test complete application flow**

1. Navigate to `http://localhost:5177/login` - verify art deco design
2. Navigate to `http://localhost:5177/register` - verify art deco design
3. Login and check dashboard - verify modern functional design
4. Test all CRUD operations for customers, products, invoices
5. Verify responsive design on mobile viewport

Expected: Smooth transition from art deco auth to modern dashboard, all features working

- [ ] **Step 2: Check for console errors**

Open browser DevTools console
Expected: No errors or warnings

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete MyInvois redesign

- Art deco aesthetic for auth pages (login/register)
- Modern functional design for dashboard and data pages
- Clean table designs with hover effects
- Form validation and error handling
- Status badges for invoices
- Responsive design for all screen sizes
- Consistent navy/gold color palette throughout"
```

---

## Implementation Complete

All pages have been redesigned following the hybrid aesthetic approach:
- ✅ Auth pages: Art deco split-screen with elegant typography
- ✅ Dashboard: Modern, functional design optimized for data
- ✅ Tables: Clean design with search, filters, and hover effects
- ✅ Forms: Validated inputs with clear error messages
- ✅ Consistent branding: Navy/gold palette throughout

The application now provides a premium first impression while maintaining productivity-focused tools for daily use.

