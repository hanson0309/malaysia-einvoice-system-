import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { autoConsolidateApi, type JobProgress } from '../lib/api';
import {
  LayoutDashboard,
  Package,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  Users,
  Smartphone,
  Receipt,
  PackageOpen,
  Calendar,
  UserCog,
  Sliders,
  Database
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [profileOpen, setProfileOpen] = React.useState(false);

  // Global IRB submission progress bar (visible on all pages)
  const [irbProgress, setIrbProgress] = useState<JobProgress | null>(null);
  const [showIrbProgress, setShowIrbProgress] = useState(false);
  const irbPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoConsoTriggedRef = useRef(false);
  const isDismissedRef = useRef(false);
  const autoCloseScheduledRef = useRef(false);

  // On mount: check if today is 1st-7th and auto-consolidate is enabled → trigger automatically
  useEffect(() => {
    if (!user || autoConsoTriggedRef.current) return;
    const day = new Date().getDate();
    if (day < 1 || day > 7) return;

    autoConsoTriggedRef.current = true;
    autoConsolidateApi.getSettings().then((res) => {
      if (res.data.enabled) {
        autoConsolidateApi.run(false).catch(() => {});
        setShowIrbProgress(true);
      }
    }).catch(() => {});
  }, [user]);

  // Poll progress every 1s; slow to 10s when idle
  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await autoConsolidateApi.getProgress();
        setIrbProgress(data);
        if (data.running) {
          // New job started — reset dismissed flag so bar shows again
          isDismissedRef.current = false;
          autoCloseScheduledRef.current = false;
          setShowIrbProgress(true);
        } else if ((data.total ?? 0) > 0 && !isDismissedRef.current) {
          setShowIrbProgress(true);
        }
        // Auto-hide 8 seconds after job finishes (schedule only once per completion)
        if (!data.running && (data.total ?? 0) > 0 && (data.processed ?? 0) >= (data.total ?? 0) && !autoCloseScheduledRef.current) {
          autoCloseScheduledRef.current = true;
          setTimeout(() => {
            setShowIrbProgress(false);
            isDismissedRef.current = true;
          }, 8000);
        }
      } catch {}
    };
    poll();
    if (irbPollRef.current) clearInterval(irbPollRef.current);
    const interval = irbProgress?.running ? 1000 : 10000;
    irbPollRef.current = setInterval(poll, interval);
    return () => { if (irbPollRef.current) clearInterval(irbPollRef.current); };
  }, [irbProgress?.running]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/dashboard/products', icon: Package },
    { name: 'Customers', href: '/dashboard/customers', icon: Users },
    { name: 'SQL Connection', href: '/dashboard/sql-connection', icon: Database },
    { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
    { name: 'POS Devices', href: '/dashboard/pos-devices', icon: Smartphone, section: 'POS Management' },
    { name: 'POS Transactions', href: '/dashboard/pos-transactions', icon: Receipt, section: 'POS Management' },
    { name: 'POS Inventory', href: '/dashboard/pos-inventory', icon: PackageOpen, section: 'POS Management' },
    { name: 'POS Appointments', href: '/dashboard/pos-appointments', icon: Calendar, section: 'POS Management' },
    { name: 'POS Employees', href: '/dashboard/pos-employees', icon: UserCog, section: 'POS Management' },
    { name: 'POS Settings', href: '/dashboard/pos-settings', icon: Sliders, section: 'POS Management' },
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
                const showSectionHeader = item.section && (index === 0 || navigation[index - 1].section !== item.section);

                return (
                  <div key={item.name}>
                    {showSectionHeader && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        marginTop: index > 0 ? '1rem' : '0',
                        marginBottom: '0.5rem',
                      }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          {item.section}
                        </span>
                      </div>
                    )}
                    <motion.div
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
                  </div>
                );
              })}
            </div>
          </nav>
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
              {/* System Status */}
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

              {/* Profile Dropdown */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  onClick={() => setProfileOpen(!profileOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    cursor: 'pointer',
                    color: '#f1f5f9'
                  }}
                  whileHover={{ scale: 1.02, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User style={{ width: '18px', height: '18px', color: 'white' }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9' }}>
                      {user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Profile
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: profileOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                  </motion.div>
                </motion.button>

                {/* Dropdown Menu */}
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.5rem)',
                      right: 0,
                      minWidth: '240px',
                      background: 'rgba(30, 41, 59, 0.98)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                      overflow: 'hidden',
                      zIndex: 50
                    }}
                  >
                    {/* Profile Info */}
                    <div style={{
                      padding: '1rem',
                      borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                        {user?.email}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Account Active
                      </p>
                    </div>

                    {/* Profile Link */}
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setProfileOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        color: '#94a3b8',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                        e.currentTarget.style.color = '#8b5cf6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#94a3b8';
                      }}
                    >
                      <User style={{ width: '18px', height: '18px' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>My Profile</span>
                    </Link>

                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        background: 'transparent',
                        border: 'none',
                        borderTop: '1px solid rgba(139, 92, 246, 0.2)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <LogOut style={{ width: '18px', height: '18px' }} />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </div>
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

      {/* Global IRB Submission Progress Bar — fixed bottom overlay, visible on all pages */}
      <AnimatePresence>
        {showIrbProgress && irbProgress && (irbProgress.running || (irbProgress.total ?? 0) > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: sidebarOpen ? 288 : 0,
              right: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.97)',
              borderTop: '1px solid rgba(139, 92, 246, 0.4)',
              padding: '0.75rem 1.5rem',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c4b5fd' }}>
                {irbProgress.running ? '⚡ Processing E-Invoice Submission...' : '✅ Submission Complete'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {irbProgress.processed ?? 0}/{irbProgress.total ?? 0} invoices
                  {(irbProgress.succeeded ?? 0) > 0 && <span style={{ color: '#34d399', marginLeft: '0.5rem' }}>✓ {irbProgress.succeeded}</span>}
                  {(irbProgress.failed ?? 0) > 0 && <span style={{ color: '#f87171', marginLeft: '0.5rem' }}>✗ {irbProgress.failed}</span>}
                </span>
                <button
                  onClick={() => { setShowIrbProgress(false); isDismissedRef.current = true; }}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px 6px', fontSize: '1rem', lineHeight: 1 }}
                >×</button>
              </div>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(71,85,105,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${irbProgress.total ? Math.round(((irbProgress.processed ?? 0) / irbProgress.total) * 100) : 0}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: irbProgress.running
                    ? 'linear-gradient(90deg, #7c3aed, #8b5cf6, #a78bfa)'
                    : 'linear-gradient(90deg, #059669, #34d399)',
                  borderRadius: '3px',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
            {irbProgress.running && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', justifyContent: 'center' }}>
                {[0, 150, 300].map(delay => (
                  <div key={delay} style={{
                    width: '4px', height: '4px', borderRadius: '50%', background: '#8b5cf6',
                    animation: 'bounce 1s infinite',
                    animationDelay: `${delay}ms`
                  }} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
