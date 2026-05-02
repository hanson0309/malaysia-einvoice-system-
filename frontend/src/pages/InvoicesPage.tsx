import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit2, Trash2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceApi.getAll();
      // Map API response to our interface
      const mappedInvoices = response.data.map((inv: any) => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name || 'Unknown',
        date: inv.issueDate,
        total: inv.totalAmount,
        status: mapStatus(inv.myInvoisStatus || inv.status)
      }));
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

  // Filter invoices by search query AND status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage and track all your invoices</p>
        </div>
      </motion.div>

      {/* Table Container */}
      <motion.div
        className="table-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Table Header with Filters */}
        <div className="table-header">
          <div className="table-filters">
            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="validated">Validated</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Search Input */}
            <div className="search-input-wrapper">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* New Invoice Button */}
          <Link to="/dashboard/invoices/new" className="btn-primary">
            <Plus size={18} />
            New Invoice
          </Link>
        </div>

        {/* Data Table */}
        {filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3 className="empty-state-title">No invoices found</h3>
            <p className="empty-state-description">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first invoice'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link to="/dashboard/invoices/new" className="btn-primary" style={{ marginTop: '1rem' }}>
                <Plus size={18} />
                Create Invoice
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, index) => (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <td className="font-medium">{invoice.invoiceNumber}</td>
                    <td>{invoice.customerName}</td>
                    <td className="text-muted">{formatDate(invoice.date)}</td>
                    <td className="amount-cell">{formatPrice(invoice.total)}</td>
                    <td>
                      <span className={`status-badge status-${invoice.status}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link
                          to={`/dashboard/invoices/${invoice.id}`}
                          className="btn-icon"
                          title="View invoice"
                        >
                          <Eye size={16} />
                        </Link>
                        {invoice.status === 'draft' && (
                          <Link
                            to={`/dashboard/invoices/${invoice.id}/edit`}
                            className="btn-icon"
                            title="Edit invoice"
                          >
                            <Edit2 size={16} />
                          </Link>
                        )}
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="btn-icon btn-icon-danger"
                          title="Delete invoice"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
