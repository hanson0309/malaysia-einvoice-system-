import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Package, Plus, Minus, X, Search } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import '../styles/elegant-theme.css';

interface InventoryLog {
  _id: string;
  product_id: string;
  product_name: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'stocktake';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export default function POSInventoryPage() {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Adjust form
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Restock form
  const [restockProductId, setRestockProductId] = useState('');
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockSupplier, setRestockSupplier] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await api.get(`/pos/inventory/logs?${params.toString()}`);
      setLogs(response.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load inventory logs');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustProductId || !adjustQuantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsAdjusting(true);
      await api.post('/pos/inventory/adjust', {
        product_id: adjustProductId,
        quantity_change: parseInt(adjustQuantity),
        notes: adjustNotes,
      });
      toast.success('Inventory adjusted successfully');
      setShowAdjustModal(false);
      resetAdjustForm();
      loadLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to adjust inventory');
      console.error(err);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleRestock = async () => {
    if (!restockProductId || !restockQuantity || !restockCost) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsRestocking(true);
      await api.post('/pos/inventory/restock', {
        product_id: restockProductId,
        quantity: parseInt(restockQuantity),
        cost_per_unit: parseFloat(restockCost),
        supplier: restockSupplier,
        notes: restockNotes,
      });
      toast.success('Inventory restocked successfully');
      setShowRestockModal(false);
      resetRestockForm();
      loadLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to restock inventory');
      console.error(err);
    } finally {
      setIsRestocking(false);
    }
  };

  const resetAdjustForm = () => {
    setAdjustProductId('');
    setAdjustQuantity('');
    setAdjustNotes('');
  };

  const resetRestockForm = () => {
    setRestockProductId('');
    setRestockQuantity('');
    setRestockCost('');
    setRestockSupplier('');
    setRestockNotes('');
  };

  const filteredLogs = logs.filter((log) =>
    log.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.transaction_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' };
      case 'sale':
        return { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' };
      case 'adjustment':
        return { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' };
      case 'stocktake':
        return { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' };
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
              POS Inventory
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {filteredLogs.length} {filteredLogs.length === 1 ? 'transaction' : 'transactions'} recorded
            </motion.p>
          </div>

          <motion.div
            style={{ display: 'flex', gap: '0.75rem' }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.button
              onClick={() => setShowAdjustModal(true)}
              className="elegant-btn elegant-btn-secondary"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Minus size={18} strokeWidth={2.5} />
              <span>Adjust</span>
            </motion.button>
            <motion.button
              onClick={() => setShowRestockModal(true)}
              className="elegant-btn elegant-btn-primary"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Restock</span>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Toolbar with Search and Filter */}
      <motion.div
        className="elegant-toolbar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="elegant-search-container">
          <Search className="elegant-search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by product name, type, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="elegant-search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '0.625rem 1rem',
              borderRadius: 'var(--radius-sharp)',
              background: 'var(--elegant-bg-secondary)',
              border: '1px solid var(--elegant-border)',
              color: 'var(--elegant-text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <option value="all">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="adjustment">Adjustment</option>
            <option value="stocktake">Stocktake</option>
          </select>

          <motion.button
            onClick={loadLogs}
            className="elegant-btn elegant-btn-secondary"
            style={{ padding: '0.625rem 1rem' }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter size={16} />
            <span>Apply</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Inventory logs table */}
      <AnimatePresence mode="wait">
        {filteredLogs.length === 0 ? (
          <motion.div
            className="elegant-empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="elegant-empty-icon">📦</div>
            <h3 className="elegant-empty-title">No inventory logs found</h3>
            <p className="elegant-empty-description">
              {searchQuery ? 'Try adjusting your search criteria' : 'Start by adjusting inventory or restocking products'}
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
                  <th style={{ textAlign: 'left' }}>Product</th>
                  <th style={{ textAlign: 'left' }}>Type</th>
                  <th style={{ textAlign: 'right' }}>Change</th>
                  <th style={{ textAlign: 'right' }}>Before</th>
                  <th style={{ textAlign: 'right' }}>After</th>
                  <th style={{ textAlign: 'left' }}>Date</th>
                  <th style={{ textAlign: 'left' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => {
                  const typeColor = getTypeColor(log.transaction_type);

                  return (
                    <motion.tr
                      key={log._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sharp)',
                            background: 'rgba(139, 92, 246, 0.15)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Package size={18} style={{ color: 'var(--elegant-accent-purple)' }} />
                          </div>
                          <span style={{
                            color: 'var(--elegant-text-primary)',
                            fontFamily: 'var(--font-sans)',
                            fontWeight: 500,
                          }}>
                            {log.product_name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          background: typeColor.bg,
                          border: `1px solid ${typeColor.border}`,
                          color: typeColor.text,
                          fontSize: '0.8125rem',
                          fontFamily: 'var(--font-sans)',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}>
                          {log.transaction_type}
                        </span>
                      </td>
                      <td style={{
                        textAlign: 'right',
                        color: log.quantity_change > 0 ? '#10b981' : '#ef4444',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                      }}>
                        {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        color: 'var(--elegant-text-muted)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.9375rem',
                      }}>
                        {log.quantity_before}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        color: 'var(--elegant-text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                      }}>
                        {log.quantity_after}
                      </td>
                      <td style={{
                        color: 'var(--elegant-text-muted)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.875rem',
                      }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{
                        color: 'var(--elegant-text-muted)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.875rem',
                      }}>
                        {log.notes || '—'}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjust Inventory Modal */}
      <AnimatePresence>
        {showAdjustModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1rem',
            }}
            onClick={() => setShowAdjustModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="elegant-card"
              style={{
                maxWidth: '500px',
                width: '100%',
                padding: '2rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.75rem',
                  fontWeight: 500,
                  color: 'var(--elegant-text-primary)',
                }}>
                  Adjust Inventory
                </h3>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--elegant-text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    transition: 'color 0.2s ease',
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--elegant-text-muted)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}>
                  Product ID
                </label>
                <input
                  type="text"
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  placeholder="Enter product ID"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sharp)',
                    background: 'var(--elegant-bg-secondary)',
                    border: '1px solid var(--elegant-border)',
                    color: 'var(--elegant-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--elegant-text-muted)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}>
                  Quantity Change (use negative for decrease)
                </label>
                <input
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="e.g., -5 or +10"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sharp)',
                    background: 'var(--elegant-bg-secondary)',
                    border: '1px solid var(--elegant-border)',
                    color: 'var(--elegant-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--elegant-text-muted)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}>
                  Notes (optional)
                </label>
                <textarea
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Reason for adjustment"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sharp)',
                    background: 'var(--elegant-bg-secondary)',
                    border: '1px solid var(--elegant-border)',
                    color: 'var(--elegant-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              <motion.button
                onClick={handleAdjust}
                disabled={isAdjusting}
                className="elegant-btn elegant-btn-primary"
                style={{ width: '100%' }}
                whileHover={!isAdjusting ? { y: -2 } : {}}
                whileTap={!isAdjusting ? { scale: 0.98 } : {}}
              >
                {isAdjusting ? 'Adjusting...' : 'Adjust Inventory'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restock Modal */}
      <AnimatePresence>
        {showRestockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1rem',
            }}
            onClick={() => setShowRestockModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="elegant-card"
              style={{
                maxWidth: '500px',
                width: '100%',
                padding: '2rem',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.75rem',
                  fontWeight: 500,
                  color: 'var(--elegant-text-primary)',
                }}>
                  Restock Inventory
                </h3>
                <button
                  onClick={() => setShowRestockModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--elegant-text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    transition: 'color 0.2s ease',
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--elegant-text-muted)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}>
                  Product ID
                </label>
                <input
                  type="text"
                  value={restockProductId}
                  onChange={(e) => setRestockProductId(e.target.value)}
                  placeholder="Enter product ID"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sharp)',
                    background: 'var(--elegant-bg-secondary)',
                    border: '1px solid var(--elegant-border)',
                    color: 'var(--elegant-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--elegant-text-muted)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}>
                  Quantity
                </label>
                <input
                  type="number"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sharp)',
                    background: 'var(--elegant-bg-secondary)',
                    border: '1px solid var(--elegant-border)',
                    color: 'var(--elegant-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--elegant-text-muted)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}>
                  Cost Per Unit (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  placeholder="Enter cost per unit"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sharp)',
                    background: 'var(--elegant-bg-secondary)',
                    border: '1px solid var(--elegant-border)',
                    color: 'var(--elegant-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--elegant-text-muted)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}>
                  Supplier (optional)
                </label>
                <input
                  type="text"
                  value={restockSupplier}
                  onChange={(e) => setRestockSupplier(e.target.value)}
                  placeholder="Enter supplier name"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sharp)',
                    background: 'var(--elegant-bg-secondary)',
                    border: '1px solid var(--elegant-border)',
                    color: 'var(--elegant-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--elegant-text-muted)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}>
                  Notes (optional)
                </label>
                <textarea
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="Additional notes"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sharp)',
                    background: 'var(--elegant-bg-secondary)',
                    border: '1px solid var(--elegant-border)',
                    color: 'var(--elegant-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              <motion.button
                onClick={handleRestock}
                disabled={isRestocking}
                className="elegant-btn elegant-btn-primary"
                style={{ width: '100%' }}
                whileHover={!isRestocking ? { y: -2 } : {}}
                whileTap={!isRestocking ? { scale: 0.98 } : {}}
              >
                {isRestocking ? 'Restocking...' : 'Restock Inventory'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
