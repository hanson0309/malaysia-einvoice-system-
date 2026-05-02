import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Trash2, Search, FileText, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoiceApi } from '../lib/api';
import InvoiceDetailModal from '../components/InvoiceDetailModal';

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      console.log('Loading invoices...');
      const response = await invoiceApi.getAll();
      console.log('Invoices API response:', response.data);

      // Handle nested data structure from backend
      const invoicesData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      console.log('Parsed invoices:', invoicesData);

      const mappedInvoices = invoicesData.map((inv: any) => ({
        id: inv._id,
        invoiceNumber: inv.invoice_number,
        customerName: inv.customer?.name || 'Unknown',
        date: inv.issue_date,
        total: inv.total_amount,
        status: mapStatus(inv.status)
      }));

      console.log('Mapped invoices:', mappedInvoices);
      setInvoices(mappedInvoices);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapStatus = (status: string): 'draft' | 'submitted' | 'validated' | 'rejected' => {
    const statusMap: Record<string, 'draft' | 'submitted' | 'validated' | 'rejected'> = {
      'draft': 'draft',
      'pending': 'submitted',
      'submitted': 'submitted',
      'validated': 'validated',
      'rejected': 'rejected',
      'sent': 'submitted',
      'paid': 'validated',
      'cancelled': 'rejected'
    };
    return statusMap[status.toLowerCase()] || 'draft';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await invoiceApi.delete(id);
      await loadInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      draft: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
      submitted: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
      validated: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
      rejected: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' }
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <motion.div
          style={{ position: 'relative' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(139, 92, 246, 0.3)',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%'
            }}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            padding: '0.5rem',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%)',
            borderRadius: '0.75rem'
          }}>
            <FileText style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
          </div>
          <div>
            <h1 style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              color: '#f1f5f9',
              marginBottom: '0.25rem'
            }}>
              Invoices
            </h1>
            <p style={{ fontSize: '1rem', color: '#94a3b8' }}>
              Manage and track all your invoices
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters and Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}
      >
        {/* Status Filter */}
        <div style={{ position: 'relative' }}>
          <Filter style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '18px',
            height: '18px',
            color: '#94a3b8',
            pointerEvents: 'none'
          }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '0.75rem',
              color: '#f1f5f9',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              minWidth: '150px'
            }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="validated">Validated</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '18px',
            height: '18px',
            color: '#94a3b8',
            pointerEvents: 'none'
          }} />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '0.75rem',
              color: '#f1f5f9',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        {/* New Invoice Button */}
        <Link to="/dashboard/invoices/new" style={{ textDecoration: 'none' }}>
          <motion.button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              border: 'none',
              borderRadius: '0.75rem',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            New Invoice
          </motion.button>
        </Link>
      </motion.div>

      {/* Content */}
      {filteredInvoices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '1.5rem',
            minHeight: '400px'
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              padding: '2rem',
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '50%',
              marginBottom: '1.5rem'
            }}
          >
            <FileText style={{ width: '64px', height: '64px', color: '#f59e0b' }} />
          </motion.div>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#f1f5f9',
            marginBottom: '0.5rem'
          }}>
            No invoices found
          </h3>
          <p style={{
            fontSize: '1rem',
            color: '#94a3b8',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first invoice'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Link to="/dashboard/invoices/new" style={{ textDecoration: 'none' }}>
              <motion.button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1.75rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                  border: 'none',
                  borderRadius: '0.75rem',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus style={{ width: '18px', height: '18px' }} />
                Create Invoice
              </motion.button>
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '1.5rem',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
                  <th style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    Invoice Number
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    Customer
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    Date
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    Amount
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'right',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, index) => {
                  const statusColor = getStatusColor(invoice.status);
                  return (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      style={{
                        borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
                        transition: 'background 0.2s'
                      }}
                      whileHover={{ background: 'rgba(139, 92, 246, 0.05)' }}
                    >
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#f1f5f9'
                      }}>
                        {invoice.invoiceNumber}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#cbd5e1'
                      }}>
                        {invoice.customerName}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#94a3b8'
                      }}>
                        {formatDate(invoice.date)}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#f1f5f9'
                      }}>
                        {formatPrice(invoice.total)}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background: statusColor.bg,
                          color: statusColor.text,
                          border: `1px solid ${statusColor.border}`
                        }}>
                          {invoice.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'flex-end'
                        }}>
                          <motion.button
                            onClick={() => setSelectedInvoiceId(invoice.id)}
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '0.5rem',
                              color: '#60a5fa',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            whileHover={{ scale: 1.1, background: 'rgba(59, 130, 246, 0.2)' }}
                            whileTap={{ scale: 0.9 }}
                            title="View"
                          >
                            <Eye style={{ width: '16px', height: '16px' }} />
                          </motion.button>
                          <motion.button
                            onClick={() => handleDelete(invoice.id)}
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '0.5rem',
                              color: '#f87171',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.2)' }}
                            whileTap={{ scale: 0.9 }}
                            title="Delete"
                          >
                            <Trash2 style={{ width: '16px', height: '16px' }} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {selectedInvoiceId && (
          <InvoiceDetailModal
            invoiceId={selectedInvoiceId}
            onClose={() => setSelectedInvoiceId(null)}
            onUpdate={loadInvoices}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
