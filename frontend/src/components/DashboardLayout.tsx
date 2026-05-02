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
    <div className="min-h-screen" style={{ background: 'var(--color-dark)' }}>
      {/* Sidebar */}
      <motion.aside
        initial={{ x: 0 }}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full w-72 glass border-r z-50"
        style={{ borderColor: 'rgba(212, 175, 55, 0.1)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b" style={{ borderColor: 'rgba(212, 175, 55, 0.1)' }}>
            <h1 className="text-3xl font-bold gradient-text">MyInvois</h1>
            <p className="text-xs mt-1 tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>
              Professional Edition
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
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
                    className="flex items-center px-4 py-3 rounded-lg transition-all duration-300 group relative overflow-hidden"
                    style={{
                      background: active ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                      color: active ? 'var(--color-gold)' : 'var(--color-text-muted)',
                    }}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 rounded-lg"
                        style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className="w-5 h-5 mr-3 relative z-10" />
                    <span className="font-medium relative z-10">{item.name}</span>
                    {active && (
                      <motion.div
                        className="ml-auto w-2 h-2 rounded-full relative z-10"
                        style={{ background: 'var(--color-gold)' }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t" style={{ borderColor: 'rgba(212, 175, 55, 0.1)' }}>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-surface)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {user?.email}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Account Active
                </p>
              </div>
              <motion.button
                onClick={handleLogout}
                className="ml-3 p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                whileHover={{
                  scale: 1.1,
                  color: 'var(--color-gold)',
                  background: 'rgba(212, 175, 55, 0.1)'
                }}
                whileTap={{ scale: 0.95 }}
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <motion.div
        animate={{ marginLeft: sidebarOpen ? 288 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen"
      >
        {/* Top bar */}
        <div className="sticky top-0 z-40 glass border-b" style={{ borderColor: 'rgba(212, 175, 55, 0.1)' }}>
          <div className="flex items-center justify-between px-8 py-4">
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              whileHover={{
                scale: 1.1,
                color: 'var(--color-gold)',
                background: 'rgba(212, 175, 55, 0.1)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>

            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                  System Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-8">
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
