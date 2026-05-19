import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Filter } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

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

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
          POS Employees
        </h1>
        <p style={{ color: '#94a3b8' }}>Manage employee access and PIN codes for POS devices</p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '1rem',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#f1f5f9',
                fontSize: '1rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#f1f5f9',
                fontSize: '1rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <motion.button
          onClick={loadEmployees}
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
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          <Filter style={{ width: '20px', height: '20px' }} />
          Apply Filters
        </motion.button>
      </div>

      {/* Loading state */}
      {isLoading && <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}

      {/* Employees table */}
      {!isLoading && employees.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '1rem',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Employee
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Employee Code
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Role
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee, index) => {
                  const statusColor = getStatusColor(employee.active_status);
                  const roleColor = getRoleBadgeColor(employee.role);

                  return (
                    <motion.tr
                      key={employee._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}
                    >
                      <td style={{ padding: '1rem' }}>
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
                      <td style={{ padding: '1rem' }}>
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
                      <td style={{ padding: '1rem' }}>
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
                      <td style={{ padding: '1rem' }}>
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
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>
                        {new Date(employee.created_at).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && employees.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '4rem' }}>
          No employees found. Employees are managed through the user management system.
        </div>
      )}

      {/* Info box */}
      <div style={{
        marginTop: '2rem',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '0.75rem',
        padding: '1rem',
      }}>
        <p style={{ color: '#3b82f6', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Employee PIN Management
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Employees can set their PIN codes through their profile settings. PIN codes are used for quick login on POS devices.
          Employee codes are automatically generated during user registration.
        </p>
      </div>
    </div>
  );
}
