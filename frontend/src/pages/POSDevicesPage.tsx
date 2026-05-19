import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Smartphone, Monitor, X, Copy, Check, Trash2 } from 'lucide-react';
import { posDevicesApi, type POSDevice } from '../lib/api';
import toast from 'react-hot-toast';

export default function POSDevicesPage() {
  const [devices, setDevices] = useState<POSDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState<'tablet' | 'desktop'>('tablet');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDeviceCode, setCopiedDeviceCode] = useState<string | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; status: string } | null>(null);
  const [deviceTimers, setDeviceTimers] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDevices();
  }, []);

  // Countdown timer for pairing code expiration in modal
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Countdown timers for pending devices in table
  useEffect(() => {
    const pendingDevices = devices.filter(
      d => d.status === 'pending' && d.pairing_code_expires_at
    );

    if (pendingDevices.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const newTimers: Record<string, number> = {};

      pendingDevices.forEach(device => {
        if (device.pairing_code_expires_at) {
          const expiry = new Date(device.pairing_code_expires_at).getTime();
          const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
          newTimers[device._id] = remaining;
        }
      });

      setDeviceTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [devices]);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await posDevicesApi.getAll();
      setDevices(response.data || []);
    } catch (err) {
      setError('Failed to load POS devices');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePairingCode = async () => {
    if (!deviceName.trim()) {
      toast.error('Please enter a device name');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await posDevicesApi.generatePairingCode({
        device_name: deviceName,
        device_type: deviceType,
      });

      setGeneratedCode(response.data.pairing_code);
      setExpiresAt(response.data.expires_at);
      toast.success('Pairing code generated successfully');
      loadDevices(); // Refresh device list
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate pairing code');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setDeviceName('');
    setDeviceType('tablet');
    setGeneratedCode(null);
    setExpiresAt(null);
    setTimeRemaining(0);
    setCopiedCode(false);
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopiedCode(true);
      toast.success('Pairing code copied to clipboard');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    setDeactivateConfirm({ id, name });
  };

  const confirmDeactivate = async () => {
    if (!deactivateConfirm) return;

    try {
      await posDevicesApi.deactivate(deactivateConfirm.id);
      toast.success('Device deactivated successfully');
      setDeactivateConfirm(null);
      loadDevices(); // Reload to show updated status
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to deactivate device');
      console.error(err);
      setDeactivateConfirm(null);
    }
  };

  const handleDelete = async (id: string, name: string, status: string) => {
    setDeleteConfirm({ id, name, status });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await posDevicesApi.permanentDelete(deleteConfirm.id);
      toast.success('Device permanently deleted');
      setDeleteConfirm(null);
      loadDevices(); // Reload the list
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete device');
      console.error(err);
      setDeleteConfirm(null);
    }
  };

  const handleCopyDeviceCode = (code: string, deviceId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedDeviceCode(deviceId);
    toast.success('Pairing code copied to clipboard');
    setTimeout(() => setCopiedDeviceCode(null), 2000);
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' };
      case 'pending':
        return { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' };
      case 'inactive':
        return { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' };
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9' }}>POS Devices</h1>
        <motion.button
          onClick={() => setShowModal(true)}
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
          Generate Pairing Code
        </motion.button>
      </div>

      {/* Loading/Error states */}
      {isLoading && <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}
      {error && <div style={{ textAlign: 'center', color: '#ef4444' }}>{error}</div>}

      {/* Device list table */}
      {!isLoading && !error && devices.length > 0 && (
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
                    Device Name
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Device Type
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Pairing Code
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Last Sync
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#8b5cf6', fontWeight: 600, fontSize: '0.875rem' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device, index) => {
                  const statusColor = getStatusColor(device.status);
                  const DeviceIcon = device.device_type === 'tablet' ? Smartphone : Monitor;
                  const timeLeft = deviceTimers[device._id] || 0;
                  const isExpiringSoon = timeLeft > 0 && timeLeft < 300; // Less than 5 minutes

                  return (
                    <motion.tr
                      key={device._id}
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
                            <DeviceIcon style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
                          </div>
                          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{device.device_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>
                          {device.device_type}
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
                          {device.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {device.status === 'pending' && device.pairing_code && timeLeft > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: isExpiringSoon ? '#ef4444' : '#8b5cf6',
                              letterSpacing: '0.1rem',
                            }}>
                              {device.pairing_code}
                            </span>
                            <motion.button
                              onClick={() => handleCopyDeviceCode(device.pairing_code!, device._id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: copiedDeviceCode === device._id ? '#10b981' : '#8b5cf6',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              {copiedDeviceCode === device._id ? (
                                <Check style={{ width: '16px', height: '16px' }} />
                              ) : (
                                <Copy style={{ width: '16px', height: '16px' }} />
                              )}
                            </motion.button>
                            <span style={{
                              fontSize: '0.875rem',
                              color: isExpiringSoon ? '#ef4444' : '#fbbf24',
                              fontWeight: 600,
                              fontFamily: 'monospace',
                            }}>
                              {formatTimeRemaining(timeLeft)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>
                        {device.last_sync
                          ? new Date(device.last_sync).toLocaleString()
                          : 'Never'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {device.status === 'active' ? (
                            <motion.button
                              onClick={() => handleDeactivate(device._id, device.device_name)}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(251, 191, 36, 0.2)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                color: '#fbbf24',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Deactivate
                            </motion.button>
                          ) : (
                            <motion.button
                              onClick={() => handleDelete(device._id, device.device_name, device.status)}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Trash2 style={{ width: '16px', height: '16px' }} />
                              Delete
                            </motion.button>
                          )}
                        </div>
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
      {!isLoading && !error && devices.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '4rem' }}>
          No POS devices yet. Click "Generate Pairing Code" to add one.
        </div>
      )}

      {/* Generate Pairing Code Modal */}
      <AnimatePresence>
        {showModal && (
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
            onClick={handleCloseModal}
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
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f1f5f9' }}>
                  Generate Pairing Code
                </h3>
                <button
                  onClick={handleCloseModal}
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

              {!generatedCode ? (
                <>
                  {/* Device Name Input */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                      Device Name
                    </label>
                    <input
                      type="text"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="e.g., Counter 1 Tablet"
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

                  {/* Device Type Select */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                      Device Type
                    </label>
                    <select
                      value={deviceType}
                      onChange={(e) => setDeviceType(e.target.value as 'tablet' | 'desktop')}
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
                      <option value="tablet">Tablet</option>
                      <option value="desktop">Desktop</option>
                    </select>
                  </div>

                  {/* Generate Button */}
                  <motion.button
                    onClick={handleGeneratePairingCode}
                    disabled={isGenerating}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: isGenerating
                        ? 'rgba(139, 92, 246, 0.5)'
                        : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      border: 'none',
                      color: 'white',
                      fontWeight: 600,
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                    }}
                    whileHover={!isGenerating ? { scale: 1.02 } : {}}
                    whileTap={!isGenerating ? { scale: 0.95 } : {}}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Code'}
                  </motion.button>
                </>
              ) : (
                <>
                  {/* Generated Code Display */}
                  <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '2px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                  }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      Pairing Code
                    </p>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 700,
                      color: '#8b5cf6',
                      letterSpacing: '0.5rem',
                      fontFamily: 'monospace',
                      marginBottom: '1rem',
                    }}>
                      {generatedCode}
                    </div>
                    <motion.button
                      onClick={handleCopyCode}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        background: copiedCode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                        border: copiedCode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)',
                        color: copiedCode ? '#10b981' : '#8b5cf6',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        margin: '0 auto',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {copiedCode ? (
                        <>
                          <Check style={{ width: '16px', height: '16px' }} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy style={{ width: '16px', height: '16px' }} />
                          Copy Code
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Expiration Timer */}
                  <div style={{
                    background: timeRemaining < 300 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    border: timeRemaining < 300 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                  }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Code expires in
                    </p>
                    <p style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: timeRemaining < 300 ? '#ef4444' : '#fbbf24',
                      fontFamily: 'monospace',
                    }}>
                      {formatTimeRemaining(timeRemaining)}
                    </p>
                  </div>

                  {/* Close Button */}
                  <motion.button
                    onClick={handleCloseModal}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(148, 163, 184, 0.2)',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      color: '#94a3b8',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Close
                  </motion.button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deactivate confirmation modal */}
      {deactivateConfirm && (
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
          onClick={() => setDeactivateConfirm(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
              Deactivate Device
            </h3>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              Are you sure you want to deactivate "{deactivateConfirm.name}"? This device will no longer be able to access the system.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <motion.button
                onClick={() => setDeactivateConfirm(null)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(148, 163, 184, 0.2)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  color: '#94a3b8',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={confirmDeactivate}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                Deactivate
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
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
          onClick={() => setDeleteConfirm(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
              Delete Device
            </h3>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <motion.button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(148, 163, 184, 0.2)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  color: '#94a3b8',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
