import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', href: '/dashboard/customers', icon: Users },
    { name: 'Products', href: '/dashboard/products', icon: Package },
    { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      {/* Sidebar */}
      <motion.aside
        initial={{ x: 0 }}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          width: '288px',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 style={{
                fontSize: '1.875rem',
                fontWeight: 700,
                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.25rem'
              }}>
                MyInvois
              </h1>
              <p style={{
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#94a3b8',
                fontWeight: 500
              }}>
                Professional Edition
              </p>
            </motion.div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      to={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.75rem',
                        transition: 'all 0.3s',
                        position: 'relative',
                        overflow: 'hidden',
                        textDecoration: 'none',
                        background: active ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)' : 'transparent',
                        color: active ? '#8b5cf6' : '#64748b',
                        fontWeight: active ? 600 : 500
                      }}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeNav"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '0.75rem',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                          }}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon style={{ width: '20px', height: '20px', marginRight: '0.75rem', position: 'relative', zIndex: 10 }} />
                      <span style={{ position: 'relative', zIndex: 10 }}>{item.name}</span>
                      {active && (
                        <motion.div
                          style={{
                            marginLeft: 'auto',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#8b5cf6',
                            position: 'relative',
                            zIndex: 10
                          }}
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </nav>

          {/* User section */}
          <div style={{ padding: '1rem', borderTop: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Account Active
                </p>
              </div>
              <motion.button
                onClick={handleLogout}
                style={{
                  marginLeft: '0.75rem',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  color: '#94a3b8',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                whileHover={{ scale: 1.1, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }}
                whileTap={{ scale: 0.95 }}
                title="Logout"
              >
                <LogOut style={{ width: '20px', height: '20px' }} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <motion.div
        animate={{ marginLeft: sidebarOpen ? 288 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ minHeight: '100vh' }}
      >
        {/* Top bar */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem' }}>
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                color: '#94a3b8',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              whileHover={{ scale: 1.1, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }}
              whileTap={{ scale: 0.95 }}
            >
              {sidebarOpen ? <X style={{ width: '24px', height: '24px' }} /> : <Menu style={{ width: '24px', height: '24px' }} />}
            </motion.button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <motion.div
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#047857' }}>
                  System Online
                </span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}
