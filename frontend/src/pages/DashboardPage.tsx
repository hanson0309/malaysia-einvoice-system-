import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Calendar,
  Package,
  Users,
} from 'lucide-react';
import { invoiceApi } from '../lib/api';
import '../styles/elegant-theme.css';

interface Invoice {
  _id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  issue_date: string;
  customerName: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    accepted: 0,
    rejected: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await invoiceApi.getAll();
      const invoices = response.data.data || [];

      // Calculate stats
      const statusCounts = {
        total: invoices.length,
        draft: invoices.filter((inv: Invoice) => inv.status === 'draft').length,
        submitted: invoices.filter((inv: Invoice) => inv.status === 'submitted').length,
        accepted: invoices.filter((inv: Invoice) => inv.status === 'accepted').length,
        rejected: invoices.filter((inv: Invoice) => inv.status === 'rejected').length,
      };

      setStats(statusCounts);
      setRecentInvoices(invoices.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusCards = [
    {
      name: 'Total Invoices',
      value: stats.total,
      icon: FileText,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
      iconBg: 'rgba(139, 92, 246, 0.2)',
      iconColor: '#8b5cf6',
      link: '/dashboard/invoices',
    },
    {
      name: 'Draft',
      value: stats.draft,
      icon: Clock,
      gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(100, 116, 139, 0.1) 100%)',
      iconBg: 'rgba(148, 163, 184, 0.2)',
      iconColor: '#94a3b8',
      link: '/dashboard/invoices?status=draft',
    },
    {
      name: 'Submitted',
      value: stats.submitted,
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)',
      iconBg: 'rgba(245, 158, 11, 0.2)',
      iconColor: '#f59e0b',
      link: '/dashboard/invoices?status=submitted',
    },
    {
      name: 'Accepted',
      value: stats.accepted,
      icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(13, 148, 136, 0.1) 100%)',
      iconBg: 'rgba(16, 185, 129, 0.2)',
      iconColor: '#10b981',
      link: '/dashboard/invoices?status=accepted',
    },
    {
      name: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
      iconBg: 'rgba(239, 68, 68, 0.2)',
      iconColor: '#ef4444',
      link: '/dashboard/invoices?status=rejected',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#94a3b8',
      validated: '#3b82f6',
      submitted: '#f59e0b',
      accepted: '#10b981',
      rejected: '#ef4444',
      cancelled: '#64748b',
    };
    return colors[status] || '#94a3b8';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      validated: 'Validated',
      submitted: 'Submitted',
      accepted: 'Accepted',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
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
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '9999px',
                marginBottom: '1rem',
              }}
            >
              <Sparkles size={16} style={{ color: '#a78bfa' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#c4b5fd' }}>Welcome back</span>
            </motion.div>

            <motion.h1
              className="elegant-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Dashboard
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Your invoice management overview
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {statusCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.name}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 100,
                }}
              >
                <Link to={card.link} style={{ textDecoration: 'none' }}>
                  <motion.div
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '1.5rem',
                      padding: '2rem',
                      background: card.bgGradient,
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                      cursor: 'pointer',
                    }}
                    whileHover={{ y: -8, scale: 1.02, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      style={{
                        position: 'absolute',
                        top: '-3rem',
                        right: '-3rem',
                        width: '160px',
                        height: '160px',
                        background: card.gradient,
                        borderRadius: '50%',
                        opacity: 0.2,
                        filter: 'blur(40px)',
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />

                    <div style={{ position: 'relative', zIndex: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <motion.div
                          style={{
                            padding: '1rem',
                            borderRadius: '1rem',
                            background: card.iconBg,
                            backdropFilter: 'blur(10px)',
                          }}
                          whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          <Icon style={{ width: '28px', height: '28px', color: card.iconColor }} />
                        </motion.div>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#94a3b8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '0.5rem',
                          }}
                        >
                          {card.name}
                        </p>
                        <motion.p
                          style={{
                            fontSize: '3rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.4, type: 'spring' }}
                        >
                          {card.value}
                        </motion.p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {/* Create New Invoice */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '1.5rem',
              background: 'rgba(30, 41, 59, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              padding: '2rem',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '256px',
                height: '256px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
                borderRadius: '50%',
                filter: 'blur(60px)',
              }}
            />

            <div style={{ position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    borderRadius: '0.75rem',
                  }}
                >
                  <Sparkles style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                    Quick Actions
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Create and manage your invoices</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Link to="/dashboard/invoices/new" style={{ textDecoration: 'none' }}>
                  <motion.div
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '1.5rem',
                      borderRadius: '1rem',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
                      cursor: 'pointer',
                    }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <motion.div
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(139, 92, 246, 0.2)',
                          }}
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FileText style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
                        </motion.div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '1.125rem' }}>Create New Invoice</p>
                          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Generate a new e-invoice</p>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: [0, 90, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                        <Plus style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/dashboard/products/new" style={{ textDecoration: 'none' }}>
                  <motion.div
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '1.5rem',
                      borderRadius: '1rem',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)',
                      cursor: 'pointer',
                    }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <motion.div
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(245, 158, 11, 0.2)',
                          }}
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <Package style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
                        </motion.div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '1.125rem' }}>New Product</p>
                          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Add a new product or service</p>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: [0, 90, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
                        <Plus style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/dashboard/customers/new" style={{ textDecoration: 'none' }}>
                  <motion.div
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '1.5rem',
                      borderRadius: '1rem',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(13, 148, 136, 0.1) 100%)',
                      cursor: 'pointer',
                    }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <motion.div
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                          }}
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <Users style={{ width: '24px', height: '24px', color: '#10b981' }} />
                        </motion.div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '1.125rem' }}>New Customer</p>
                          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Add a new customer</p>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: [0, 90, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                        <Plus style={{ width: '24px', height: '24px', color: '#10b981' }} />
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Recent Invoices */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '1.5rem',
              background: 'rgba(30, 41, 59, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  padding: '0.5rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                  borderRadius: '0.75rem',
                }}
              >
                <Calendar style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                  Recent Invoices
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Latest invoice activity</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentInvoices.length === 0 ? (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                  }}
                >
                  <AlertCircle style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>No invoices yet. Create your first invoice to get started!</p>
                </div>
              ) : (
                recentInvoices.map((invoice, index) => (
                  <motion.div
                    key={invoice._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <Link to={`/dashboard/invoices/${invoice._id}`} style={{ textDecoration: 'none' }}>
                      <motion.div
                        style={{
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          background: 'rgba(139, 92, 246, 0.05)',
                          border: '1px solid rgba(139, 92, 246, 0.1)',
                          cursor: 'pointer',
                        }}
                        whileHover={{ background: 'rgba(139, 92, 246, 0.1)', x: 4 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                              {invoice.invoice_number}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {new Date(invoice.issue_date).toLocaleDateString('en-MY')}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                              RM {invoice.total_amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                            </p>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                background: `${getStatusColor(invoice.status)}20`,
                                color: getStatusColor(invoice.status),
                              }}
                            >
                              {getStatusLabel(invoice.status)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>

            {recentInvoices.length > 0 && (
              <Link to="/dashboard/invoices" style={{ textDecoration: 'none' }}>
                <motion.div
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    textAlign: 'center',
                    borderRadius: '0.5rem',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    color: '#8b5cf6',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                  whileHover={{ background: 'rgba(139, 92, 246, 0.2)' }}
                >
                  View All Invoices
                </motion.div>
              </Link>
            )}
          </motion.div>
        </div>
    </div>
  );
}
