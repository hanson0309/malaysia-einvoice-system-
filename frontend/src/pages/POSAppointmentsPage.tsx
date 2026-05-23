import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, X, Filter, Search } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import '../styles/elegant-theme.css';

interface ServiceItem {
  description: string;
  price: number;
}

interface Appointment {
  _id: string;
  customer_id: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  appointment_date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  service_items: ServiceItem[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export default function POSAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([{ description: '', price: 0 }]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);

      const response = await api.get(`/pos/appointments?${params.toString()}`);
      setAppointments(response.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load appointments');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!customerId || !appointmentDate || !startTime || !endTime || !serviceType || serviceItems.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/pos/appointments', {
        customer_id: customerId,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        service_type: serviceType,
        service_items: serviceItems.filter(item => item.description && item.price > 0),
        notes,
      });
      toast.success('Appointment created successfully');
      setShowModal(false);
      resetForm();
      loadAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create appointment');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setAppointmentDate('');
    setStartTime('');
    setEndTime('');
    setServiceType('');
    setServiceItems([{ description: '', price: 0 }]);
    setNotes('');
  };

  const addServiceItem = () => {
    setServiceItems([...serviceItems, { description: '', price: 0 }]);
  };

  const removeServiceItem = (index: number) => {
    setServiceItems(serviceItems.filter((_, i) => i !== index));
  };

  const updateServiceItem = (index: number, field: 'description' | 'price', value: string | number) => {
    const updated = [...serviceItems];
    if (field === 'description') {
      updated[index][field] = value as string;
    } else {
      updated[index][field] = value as number;
    }
    setServiceItems(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' };
      case 'pending':
        return { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' };
      case 'completed':
        return { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' };
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' };
    }
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch =
      appointment.customer_id.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.service_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
        <div className="header-content">
          <div className="header-text">
            <motion.h1
              className="elegant-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              POS Appointments
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} scheduled
            </motion.p>
          </div>

          <motion.button
            onClick={() => setShowModal(true)}
            className="elegant-btn elegant-btn-primary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>New Appointment</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Toolbar Section */}
      <motion.div
        className="elegant-toolbar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="elegant-search-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by customer or service type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="elegant-search-input"
          />
        </div>

        <div className="toolbar-actions">
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="elegant-date-input"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="elegant-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <motion.button
              onClick={loadAppointments}
              className="elegant-btn elegant-btn-secondary"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Filter size={16} />
              <span>Apply</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Appointments Table */}
      <AnimatePresence mode="wait">
        {filteredAppointments.length === 0 ? (
          <motion.div
            className="elegant-empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="empty-icon">📅</div>
            <h3>No appointments found</h3>
            <p>Start by creating your first appointment</p>
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
                  <th>Customer</th>
                  <th>Service Type</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Services</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment, index) => {
                  const statusColor = getStatusColor(appointment.status);
                  const totalPrice = appointment.service_items.reduce((sum, item) => sum + item.price, 0);

                  return (
                    <motion.tr
                      key={appointment._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <td>
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
                            <Calendar size={20} style={{ color: '#8b5cf6' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f1f5f9' }}>
                              {appointment.customer_id.name}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                              {appointment.customer_id.phone || appointment.customer_id.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: '#f1f5f9' }}>
                          {appointment.service_type}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: '#f1f5f9' }}>
                          {new Date(appointment.appointment_date).toLocaleDateString('en-MY', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: '#f1f5f9' }}>
                          {appointment.start_time} - {appointment.end_time}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: '#10b981', fontWeight: 600, fontSize: '1rem' }}>
                          RM {totalPrice.toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '9999px',
                          background: statusColor.bg,
                          border: `1px solid ${statusColor.border}`,
                          color: statusColor.text,
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          display: 'inline-block',
                        }}>
                          {appointment.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                          {appointment.service_items.length} {appointment.service_items.length === 1 ? 'item' : 'items'}
                          {appointment.notes && (
                            <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                              {appointment.notes.length > 30 ? appointment.notes.substring(0, 30) + '...' : appointment.notes}
                            </div>
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

      {/* Create Appointment Modal */}
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
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: '1rem',
                padding: '2rem',
                maxWidth: '600px',
                width: '90%',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f1f5f9' }}>
                  New Appointment
                </h3>
                <button
                  onClick={() => setShowModal(false)}
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Customer ID
                </label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Enter customer ID"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
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
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
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
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
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
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Service Type
                </label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="e.g., Haircut, Massage, Consultation"
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

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>
                    Service Items
                  </label>
                  <button
                    onClick={addServiceItem}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#8b5cf6',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Add Item
                  </button>
                </div>
                {serviceItems.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateServiceItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      style={{
                        flex: 2,
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#f1f5f9',
                        fontSize: '1rem',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateServiceItem(index, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="Price"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#f1f5f9',
                        fontSize: '1rem',
                        outline: 'none',
                      }}
                    />
                    {serviceItems.length > 1 && (
                      <button
                        onClick={() => removeServiceItem(index)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        <X style={{ width: '16px', height: '16px' }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: isSubmitting
                    ? 'rgba(139, 92, 246, 0.5)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
                whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                whileTap={!isSubmitting ? { scale: 0.95 } : {}}
              >
                {isSubmitting ? 'Creating...' : 'Create Appointment'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
