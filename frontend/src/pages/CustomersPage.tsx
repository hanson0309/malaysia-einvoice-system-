import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { customerApi } from '../lib/api';
import '../styles/dashboard.css';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  registrationNumber?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      console.log('Loading customers...');
      const response = await customerApi.getAll();
      console.log('API response:', response);
      console.log('Response data:', response.data);
      const customersData = Array.isArray(response.data) ? response.data : response.data?.data || [];
      console.log('Customers array:', customersData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      await customerApi.delete(id);
      setCustomers(customers.filter((c) => c._id !== id));
    } catch (error) {
      console.error('Failed to delete customer:', error);
      alert('Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.registrationNumber?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-header"
      >
        <h1>Customers</h1>
        <p>Manage your customer database</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="table-container"
      >
        <div className="table-header">
          <div className="search-input">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="table-actions">
            <Link to="/dashboard/customers/new">
              <button className="btn btn-primary">
                <Plus size={16} />
                New Customer
              </button>
            </Link>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={64} />
            </div>
            <div className="empty-state-title">
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </div>
            <div className="empty-state-description">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Get started by creating your first customer'}
            </div>
            {!searchQuery && (
              <Link to="/dashboard/customers/new">
                <button className="btn btn-primary">
                  <Plus size={16} />
                  New Customer
                </button>
              </Link>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registration Number</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <motion.tr
                  key={customer._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="table-cell-primary">{customer.name}</td>
                  <td className="table-cell-secondary">{customer.email}</td>
                  <td className="table-cell-secondary">
                    {customer.phone || '-'}
                  </td>
                  <td className="table-cell-secondary">
                    {customer.registrationNumber || '-'}
                  </td>
                  <td>
                    <div className="table-cell-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="table-action-btn edit"
                        onClick={() => navigate(`/dashboard/customers/${customer._id}/edit`)}
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        className="table-action-btn delete"
                        onClick={() => handleDelete(customer._id)}
                      >
                        <Trash2 size={14} />
                        Delete
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
