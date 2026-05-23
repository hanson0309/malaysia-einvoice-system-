import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Trash2, Search, CheckSquare, Square, Send, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { invoiceApi, irbApi, autoConsolidateApi } from '../lib/api';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import '../styles/elegant-theme.css';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  total: number;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  source?: 'manual' | 'pos';
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const batchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll server-side per-invoice progress while batch submit is running.
  // Keeps batchSubmitting=true until the server signals the job is done.
  useEffect(() => {
    if (!batchSubmitting) {
      if (batchPollRef.current) clearInterval(batchPollRef.current);
      return;
    }
    const poll = async () => {
      try {
        const { data } = await autoConsolidateApi.getProgress();
        // Job finished when server says running:false and all invoices accounted for
        if (!data.running && (data.total ?? 0) > 0) {
          setBatchSubmitting(false);
          setSelectedInvoices(new Set());
          loadInvoices();
        }
      } catch { /* polling errors are non-fatal */ }
    };
    poll();
    batchPollRef.current = setInterval(poll, 1000);
    return () => { if (batchPollRef.current) clearInterval(batchPollRef.current); };
  }, [batchSubmitting]);

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
        customerName: inv.customerName || inv.customer?.name || 'Walk-in Customer',
        date: inv.issue_date,
        total: inv.total_amount,
        status: mapStatus(inv.status),
        source: inv.source || 'manual'
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
      'accepted': 'validated',  // ✅ 添加这个映射
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
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const toggleSelectInvoice = (id: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvoices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const handleBatchDelete = async () => {
    const draftInvoices = Array.from(selectedInvoices).filter(id => {
      const invoice = invoices.find(inv => inv.id === id);
      return invoice?.status === 'draft';
    });

    if (draftInvoices.length === 0) {
      toast.error('Only draft invoices can be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${draftInvoices.length} invoice(s)?`)) return;

    try {
      await Promise.all(draftInvoices.map(id => invoiceApi.delete(id)));
      setSelectedInvoices(new Set());
      await loadInvoices();
      toast.success(`${draftInvoices.length} invoice(s) deleted successfully`);
    } catch (error) {
      console.error('Failed to delete invoices:', error);
      toast.error('Failed to delete some invoices');
    }
  };

  const handleBatchSubmit = async () => {
    const selectedIds = Array.from(selectedInvoices);
    if (selectedIds.length === 0) {
      toast.error('Please select at least one invoice');
      return;
    }

    if (!confirm(`Submit ${selectedIds.length} invoice(s) to IRB?`)) return;

    setBatchSubmitting(true);
    try {
      // POST returns immediately ({queued:true}); polling detects completion and stops batchSubmitting
      await irbApi.submitBatch(selectedIds);
    } catch (error) {
      console.error('Batch submit failed:', error);
      setBatchSubmitting(false);
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
    const matchesSource = sourceFilter === 'all' || invoice.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
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
              Invoices
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'} found
            </motion.p>
          </div>

          <Link to="/dashboard/invoices/new" style={{ textDecoration: 'none' }}>
            <motion.button
              className="elegant-btn elegant-btn-primary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>New Invoice</span>
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Toolbar with Search and Filters */}
      <motion.div
        className="elegant-toolbar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ flexWrap: 'wrap' }}
      >
        <div className="elegant-search-container">
          <Search className="elegant-search-icon" size={18} />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="elegant-search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="elegant-select"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="validated">Validated</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="elegant-select"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="pos">POS</option>
          </select>
        </div>
      </motion.div>

      {/* Batch Actions */}
      {selectedInvoices.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'var(--elegant-overlay)',
            border: '1px solid var(--elegant-border)',
            borderRadius: 'var(--radius-sharp)',
          }}
        >
          <span style={{
            fontSize: '0.875rem',
            color: 'var(--elegant-text-muted)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500
          }}>
            {selectedInvoices.size} selected
          </span>

          <motion.button
            onClick={handleBatchSubmit}
            disabled={batchSubmitting}
            className="elegant-btn elegant-btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.625rem 1.25rem' }}
            whileHover={!batchSubmitting ? { y: -2 } : {}}
            whileTap={!batchSubmitting ? { scale: 0.98 } : {}}
          >
            <Send size={16} />
            {batchSubmitting ? 'Submitting...' : 'Submit to IRB'}
          </motion.button>

          <motion.button
            onClick={handleBatchDelete}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
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
            whileHover={{ y: -2, background: 'rgba(239, 68, 68, 0.15)' }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 size={16} />
            Delete
          </motion.button>
        </motion.div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {filteredInvoices.length === 0 ? (
          <motion.div
            className="elegant-empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="elegant-empty-icon">📄</div>
            <h3 className="elegant-empty-title">No invoices found</h3>
            <p className="elegant-empty-description">
              {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first invoice'}
            </p>
            {!searchQuery && statusFilter === 'all' && sourceFilter === 'all' && (
              <Link to="/dashboard/invoices/new" style={{ textDecoration: 'none' }}>
                <motion.button
                  className="elegant-btn elegant-btn-primary"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus size={18} />
                  Create Invoice
                </motion.button>
              </Link>
            )}
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
                  <th style={{ width: '50px', textAlign: 'center' }}>
                    <motion.button
                      onClick={toggleSelectAll}
                      className="elegant-action-btn"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0 ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </motion.button>
                  </th>
                  <th>Invoice Number</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, index) => {
                  return (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        {['submitted', 'validated'].includes(invoice.status) ? null : (
                          <motion.button
                            onClick={() => toggleSelectInvoice(invoice.id)}
                            className="elegant-action-btn"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {selectedInvoices.has(invoice.id) ? (
                              <CheckSquare size={18} />
                            ) : (
                              <Square size={18} />
                            )}
                          </motion.button>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                        {invoice.invoiceNumber}
                      </td>
                      <td>{invoice.customerName}</td>
                      <td>{formatDate(invoice.date)}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {formatPrice(invoice.total)}
                      </td>
                      <td>
                        <span className={`elegant-badge elegant-badge-${
                          invoice.status === 'validated' ? 'success' :
                          invoice.status === 'submitted' ? 'info' :
                          invoice.status === 'rejected' ? 'danger' : 'neutral'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td>
                        <span className={`elegant-badge elegant-badge-${invoice.source === 'pos' ? 'info' : 'neutral'}`}>
                          {invoice.source || 'manual'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <motion.button
                            onClick={() => setSelectedInvoiceId(invoice.id)}
                            className="elegant-action-btn view"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="View"
                          >
                            <Eye size={16} />
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              const token = localStorage.getItem('token');
                              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
                              window.open(`${apiUrl}/invoices/${invoice.id}/pdf?token=${token}`, '_blank');
                            }}
                            className="elegant-action-btn download"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </motion.button>
                          {invoice.status === 'draft' && (
                            <motion.button
                              onClick={() => handleDelete(invoice.id)}
                              className="elegant-action-btn delete"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

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

