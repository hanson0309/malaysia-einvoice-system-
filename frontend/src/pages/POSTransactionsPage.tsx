import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Receipt, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import '../styles/elegant-theme.css';

interface POSTransaction {
  _id: string;
  transaction_number: string;
  date: string;
  cashier: {
    name: string;
    employee_code: string;
  };
  total_amount: number;
  payment_method: string;
  status: string;
  invoice_id?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  created_at: string;
}

export default function POSTransactionsPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<POSTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('source', 'pos'); // Only get POS invoices
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/invoices?${params.toString()}`);
      const invoices = response.data?.data || response.data || [];

      // Transform invoices to transaction format
      const transformedTransactions = invoices.map((inv: any) => ({
        _id: inv._id,
        transaction_number: inv.invoice_number,
        date: inv.issue_date,
        cashier: {
          name: 'POS System',
          employee_code: 'POS'
        },
        total_amount: inv.total_amount,
        payment_method: inv.payment_method || 'cash',
        status: inv.status,
        invoice_id: inv._id,
        items: inv.line_items || [],
        created_at: inv.created_at
      }));

      setTransactions(transformedTransactions);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load transactions');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    loadTransactions();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'elegant-badge elegant-badge-success';
      case 'pending':
        return 'elegant-badge elegant-badge-warning';
      case 'cancelled':
        return 'elegant-badge elegant-badge-danger';
      default:
        return 'elegant-badge elegant-badge-neutral';
    }
  };

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
        <div className="elegant-header-content">
          <div className="elegant-header-text">
            <motion.h1
              className="elegant-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              POS Transactions
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} synced
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Filters Card */}
      <motion.div
        className="elegant-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ marginBottom: '2.5rem' }}
      >
        <div className="elegant-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="elegant-form-group" style={{ marginBottom: 0 }}>
              <label className="elegant-form-label">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="elegant-form-input"
              />
            </div>
            <div className="elegant-form-group" style={{ marginBottom: 0 }}>
              <label className="elegant-form-label">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="elegant-form-input"
              />
            </div>
            <div className="elegant-form-group" style={{ marginBottom: 0 }}>
              <label className="elegant-form-label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="elegant-form-select"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <motion.button
            onClick={handleFilter}
            className="elegant-btn elegant-btn-primary"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter size={18} />
            <span>Apply Filters</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Transactions Table */}
      <AnimatePresence mode="wait">
        {transactions.length === 0 ? (
          <motion.div
            className="elegant-empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="elegant-empty-icon">🧾</div>
            <h3 className="elegant-empty-title">No transactions found</h3>
            <p className="elegant-empty-description">
              Transactions will appear here once synced from POS devices
            </p>
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
                  <th>Transaction #</th>
                  <th>Date</th>
                  <th>Cashier</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '4px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                        }}>
                          <Receipt size={20} style={{ color: 'var(--elegant-accent-purple)' }} />
                        </div>
                        <span style={{
                          color: 'var(--elegant-text-primary)',
                          fontWeight: 500,
                          fontFamily: 'var(--font-sans)',
                        }}>
                          {transaction.transaction_number}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--elegant-text-muted)' }}>
                      {new Date(transaction.date).toLocaleString('en-MY', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <div>
                        <div style={{
                          color: 'var(--elegant-text-primary)',
                          fontWeight: 500,
                          marginBottom: '0.25rem',
                        }}>
                          {transaction.cashier.name}
                        </div>
                        <div style={{
                          color: 'var(--elegant-text-subtle)',
                          fontSize: '0.8125rem',
                        }}>
                          {transaction.cashier.employee_code}
                        </div>
                      </div>
                    </td>
                    <td style={{
                      textAlign: 'right',
                      color: 'var(--elegant-text-primary)',
                      fontWeight: 600,
                      fontFamily: 'var(--font-sans)',
                    }}>
                      RM {transaction.total_amount.toFixed(2)}
                    </td>
                    <td style={{
                      color: 'var(--elegant-text-secondary)',
                      textTransform: 'capitalize',
                    }}>
                      {transaction.payment_method}
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(transaction.status)}>
                        {transaction.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {transaction.invoice_id ? (
                        <motion.button
                          onClick={() => navigate(`/dashboard/invoices/${transaction.invoice_id}`)}
                          className="elegant-action-btn view"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          title="View invoice"
                          style={{
                            display: 'inline-flex',
                            gap: '0.5rem',
                            width: 'auto',
                            padding: '0.5rem 1rem',
                          }}
                        >
                          <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>View</span>
                          <ExternalLink size={14} />
                        </motion.button>
                      ) : (
                        <span style={{
                          color: 'var(--elegant-text-subtle)',
                          fontSize: '0.8125rem',
                        }}>
                          —
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
