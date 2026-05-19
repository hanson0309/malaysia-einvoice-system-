import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, Receipt, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/pos/transactions?${params.toString()}`);
      setTransactions(response.data || []);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' };
      case 'pending':
        return { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' };
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' };
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
          POS Transactions
        </h1>
        <p style={{ color: '#94a3b8' }}>View all transactions synced from POS devices</p>
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
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#f1f5f9',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#f1f5f9',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
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
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <motion.button
          onClick={handleFilter}
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

      {/* Loading/Error states */}
      {isLoading && <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}

      {/* Transactions table */}
      {!isLoading && transactions.length > 0 && (
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
                    Transaction #
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Date
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Cashier
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Total Amount
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Payment Method
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'center', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => {
                  const statusColor = getStatusColor(transaction.status);

                  return (
                    <motion.tr
                      key={transaction._id}
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
                            <Receipt style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
                          </div>
                          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{transaction.transaction_number}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>
                        {new Date(transaction.date).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div>
                          <div style={{ color: '#f1f5f9', fontWeight: 500 }}>{transaction.cashier.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{transaction.cashier.employee_code}</div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#f1f5f9', fontWeight: 600 }}>
                        RM {transaction.total_amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                        {transaction.payment_method}
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
                          {transaction.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {transaction.invoice_id ? (
                          <motion.button
                            onClick={() => navigate(`/dashboard/invoices/${transaction.invoice_id}`)}
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '0.5rem',
                              background: 'rgba(139, 92, 246, 0.2)',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                              color: '#8b5cf6',
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            View
                            <ExternalLink style={{ width: '14px', height: '14px' }} />
                          </motion.button>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>No invoice</span>
                        )}
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
      {!isLoading && transactions.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '4rem' }}>
          No transactions found. Transactions will appear here once synced from POS devices.
        </div>
      )}
    </div>
  );
}
