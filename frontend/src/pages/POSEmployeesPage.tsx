import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Filter, Search } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import '../styles/elegant-theme.css';

interface Employee {
  _id: string;
  employee_code: string;
  email: string;
  role: string;
  active_status: 'active' | 'inactive';
  created_at: string;
}

export default function POSEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('active_status', statusFilter);

      const response = await api.get(`/pos/employees?${params.toString()}`);
      setEmployees(response.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load employees');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' };
      case 'inactive':
        return { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' };
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6' };
      case 'cashier':
        return { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' };
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
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
      {/* Header Section */}
      <motion.div
        className="elegant-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <div className="header-text">
            <motion.h1
              className="elegant-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              POS Employees
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'} registered
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Toolbar Section */}
      <motion.div
        className="elegant-toolbar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="elegant-search-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by email or employee code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="elegant-search-input"
          />
        </div>

        <div className="toolbar-actions">
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="elegant-select"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="cashier">Cashier</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="elegant-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <motion.button
              onClick={loadEmployees}
              className="elegant-btn elegant-btn-primary"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Filter size={16} />
              <span>Apply</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Employees Table */}
      <AnimatePresence mode="wait">
        {filteredEmployees.length === 0 ? (
          <motion.div
            className="elegant-empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="empty-icon">👥</div>
            <h3>No employees found</h3>
            <p>Employees are managed through the user management system</p>
          </motion.div>
        ) : (
          <motion.div
            className="elegant-table-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <table className="elegant-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee Code</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee, index) => {
                  const statusColor = getStatusColor(employee.active_status);
                  const roleColor = getRoleBadgeColor(employee.role);

                  return (
                    <motion.tr
                      key={employee._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '0.5rem',
                            background: 'rgba(139, 92, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Users style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
                          </div>
                          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{employee.email}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.5rem',
                          background: 'rgba(15, 23, 42, 0.5)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#8b5cf6',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                        }}>
                          {employee.employee_code}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          background: roleColor.bg,
                          border: `1px solid ${roleColor.border}`,
                          color: roleColor.text,
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}>
                          {employee.role}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          background: statusColor.bg,
                          border: `1px solid ${statusColor.border}`,
                          color: statusColor.text,
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}>
                          {employee.active_status}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8' }}>
                        {new Date(employee.created_at).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        style={{
          marginTop: '2rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '0.75rem',
          padding: '1rem',
        }}
      >
        <p style={{ color: '#3b82f6', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Employee PIN Management
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Employees can set their PIN codes through their profile settings. PIN codes are used for quick login on POS devices.
          Employee codes are automatically generated during user registration.
        </p>
      </motion.div>
    </div>
  );
}
