import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Package, Plus, Minus, X } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

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

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
            POS Inventory
          </h1>
          <p style={{ color: '#94a3b8' }}>Manage inventory adjustments and restocking</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <motion.button
            onClick={() => setShowAdjustModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
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
            <Minus style={{ width: '20px', height: '20px' }} />
            Adjust Inventory
          </motion.button>
          <motion.button
            onClick={() => setShowRestockModal(true)}
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
            <Plus style={{ width: '20px', height: '20px' }} />
            Restock
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '1rem',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
              Transaction Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
              <option value="adjustment">Adjustment</option>
              <option value="stocktake">Stocktake</option>
            </select>
          </div>
          <motion.button
            onClick={loadLogs}
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
            Apply Filter
          </motion.button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}

      {/* Inventory logs table */}
      {!isLoading && logs.length > 0 && (
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
                    Product
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Type
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Change
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Before
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    After
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Date
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => {
                  const typeColor = getTypeColor(log.transaction_type);

                  return (
                    <motion.tr
                      key={log._id}
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
                            <Package style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
                          </div>
                          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{log.product_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          background: typeColor.bg,
                          border: `1px solid ${typeColor.border}`,
                          color: typeColor.text,
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}>
                          {log.transaction_type}
                        </span>
                      </td>
                      <td style={{
                        padding: '1rem',
                        textAlign: 'right',
                        color: log.quantity_change > 0 ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                      }}>
                        {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#94a3b8' }}>
                        {log.quantity_before}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#f1f5f9', fontWeight: 600 }}>
                        {log.quantity_after}
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                        {log.notes || '-'}
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
      {!isLoading && logs.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '4rem' }}>
          No inventory logs found. Start by adjusting inventory or restocking products.
        </div>
      )}

      {/* Adjust Inventory Modal */}
      <AnimatePresence>
        {showAdjustModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
            onClick={() => setShowAdjustModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: '1rem',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f1f5f9' }}>
                  Adjust Inventory
                </h3>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  <X style={{ width: '24px', height: '24px' }} />
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                    borderRadius: '0.5rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                    borderRadius: '0.5rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                    borderRadius: '0.5rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <motion.button
                onClick={handleAdjust}
                disabled={isAdjusting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: isAdjusting
                    ? 'rgba(251, 191, 36, 0.5)'
                    : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  cursor: isAdjusting ? 'not-allowed' : 'pointer',
                }}
                whileHover={!isAdjusting ? { scale: 1.02 } : {}}
                whileTap={!isAdjusting ? { scale: 0.95 } : {}}
              >
                {isAdjusting ? 'Adjusting...' : 'Adjust Inventory'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restock Modal */}
      <AnimatePresence>
        {showRestockModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
            onClick={() => setShowRestockModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: '1rem',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f1f5f9' }}>
                  Restock Inventory
                </h3>
                <button
                  onClick={() => setShowRestockModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  <X style={{ width: '24px', height: '24px' }} />
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                    borderRadius: '0.5rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                    borderRadius: '0.5rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                    borderRadius: '0.5rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                    borderRadius: '0.5rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                    borderRadius: '0.5rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <motion.button
                onClick={handleRestock}
                disabled={isRestocking}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: isRestocking
                    ? 'rgba(139, 92, 246, 0.5)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  cursor: isRestocking ? 'not-allowed' : 'pointer',
                }}
                whileHover={!isRestocking ? { scale: 1.02 } : {}}
                whileTap={!isRestocking ? { scale: 0.95 } : {}}
              >
                {isRestocking ? 'Restocking...' : 'Restock Inventory'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
