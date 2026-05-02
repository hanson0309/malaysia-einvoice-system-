import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Package, FileText, TrendingUp, Plus, ArrowUpRight, Sparkles } from 'lucide-react';
import { customerApi, productApi, invoiceApi } from '../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    invoices: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [customersRes, productsRes, invoicesRes] = await Promise.all([
        customerApi.getAll(),
        productApi.getAll(),
        invoiceApi.getAll(),
      ]);

      setStats({
        customers: customersRes.data.length,
        products: productsRes.data.length,
        invoices: invoicesRes.data.length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cards = [
    {
      name: 'Total Customers',
      value: stats.customers,
      icon: Users,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
      iconBg: 'rgba(139, 92, 246, 0.2)',
      iconColor: '#8b5cf6',
      link: '/dashboard/customers',
      change: '+12%',
    },
    {
      name: 'Total Products',
      value: stats.products,
      icon: Package,
      gradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(13, 148, 136, 0.1) 100%)',
      iconBg: 'rgba(16, 185, 129, 0.2)',
      iconColor: '#10b981',
      link: '/dashboard/products',
      change: '+8%',
    },
    {
      name: 'Total Invoices',
      value: stats.invoices,
      icon: FileText,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)',
      iconBg: 'rgba(245, 158, 11, 0.2)',
      iconColor: '#f59e0b',
      link: '/dashboard/invoices',
      change: '+23%',
    },
  ];

  const quickActions = [
    {
      name: 'New Customer',
      link: '/dashboard/customers/new',
      icon: Users,
      color: '#a78bfa',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    {
      name: 'New Product',
      link: '/dashboard/products/new',
      icon: Package,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    {
      name: 'New Invoice',
      link: '/dashboard/invoices/new',
      icon: FileText,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
  ];

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
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
              width: '64px',
              height: '64px',
              border: '4px solid rgba(139, 92, 246, 0.3)',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%'
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sparkles style={{ width: '24px', height: '24px', color: '#a78bfa' }} />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{ position: 'relative', marginBottom: '2rem' }}
        >
          <div style={{
            position: 'absolute',
            top: '-1rem',
            left: '-1rem',
            width: '288px',
            height: '288px',
            background: 'rgba(139, 92, 246, 0.15)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            zIndex: 0
          }} />
          <div style={{
            position: 'absolute',
            top: '-2rem',
            right: '5rem',
            width: '384px',
            height: '384px',
            background: 'rgba(245, 158, 11, 0.08)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            zIndex: 0
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(30, 41, 59, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '9999px',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                marginBottom: '1rem'
              }}
            >
              <Sparkles style={{ width: '16px', height: '16px', color: '#a78bfa' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#c4b5fd' }}>Welcome back</span>
            </motion.div>

            <h1 style={{
              fontSize: '3.75rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
              background: 'linear-gradient(90deg, #1e293b 0%, #5b21b6 50%, #1e293b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Dashboard
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#94a3b8', fontWeight: 300 }}>
              Your invoice management at a glance
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.name}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.15,
                  type: "spring",
                  stiffness: 100
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
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                      cursor: 'pointer'
                    }}
                    whileHover={{ y: -8, scale: 1.02, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Animated background orb */}
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
                        filter: 'blur(40px)'
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />

                    <div style={{ position: 'relative', zIndex: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <motion.div
                          style={{
                            padding: '1rem',
                            borderRadius: '1rem',
                            background: card.iconBg,
                            backdropFilter: 'blur(10px)'
                          }}
                          whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          <Icon style={{ width: '28px', height: '28px', color: card.iconColor }} />
                        </motion.div>
                        <motion.div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.375rem 0.75rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '9999px'
                          }}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.15 + 0.3 }}
                        >
                          <TrendingUp style={{ width: '16px', height: '16px', color: '#059669' }} />
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#047857' }}>{card.change}</span>
                        </motion.div>
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '0.5rem'
                        }}>
                          {card.name}
                        </p>
                        <motion.p
                          style={{
                            fontSize: '3rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.15 + 0.4, type: "spring" }}
                        >
                          {card.value}
                        </motion.p>
                      </div>

                      <motion.div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: card.iconColor
                        }}
                        whileHover={{ x: 5 }}
                      >
                        <span>View details</span>
                        <ArrowUpRight style={{ width: '16px', height: '16px' }} />
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
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
            marginBottom: '2rem'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '256px',
            height: '256px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
            borderRadius: '50%',
            filter: 'blur(60px)'
          }} />

          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: '0.75rem'
              }}>
                <Sparkles style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                  Quick Actions
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  Create new records instantly
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.6 + index * 0.1,
                      type: "spring"
                    }}
                  >
                    <Link to={action.link} style={{ textDecoration: 'none' }}>
                      <motion.div
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          padding: '1.5rem',
                          borderRadius: '1rem',
                          border: `1px solid ${action.borderColor}`,
                          background: action.bgColor,
                          cursor: 'pointer'
                        }}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <motion.div
                              style={{
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                background: action.bgColor
                              }}
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.6 }}
                            >
                              <Icon style={{ width: '20px', height: '20px', color: action.color }} />
                            </motion.div>
                            <span style={{ fontWeight: 600, color: action.color }}>
                              {action.name}
                            </span>
                          </div>
                          <motion.div
                            animate={{ rotate: [0, 90, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <Plus style={{ width: '20px', height: '20px', color: action.color }} />
                          </motion.div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '1.5rem',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(13, 148, 136, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
            padding: '1.5rem'
          }}
        >
          <div style={{
            position: 'absolute',
            bottom: '-2rem',
            right: '-2rem',
            width: '128px',
            height: '128px',
            background: 'rgba(16, 185, 129, 0.2)',
            borderRadius: '50%',
            filter: 'blur(40px)'
          }} />

          <div style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                padding: '0.75rem',
                background: 'rgba(16, 185, 129, 0.2)',
                borderRadius: '1rem'
              }}>
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles style={{ width: '24px', height: '24px', color: '#10b981' }} />
                </motion.div>
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                  System Status
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  All systems operational
                </p>
              </div>
            </div>
            <motion.div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                background: 'rgba(16, 185, 129, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '9999px'
              }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                style={{
                  width: '12px',
                  height: '12px',
                  background: '#10b981',
                  borderRadius: '50%'
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#047857' }}>
                Online
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
