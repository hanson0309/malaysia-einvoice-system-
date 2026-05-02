import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Package, FileText, TrendingUp, Plus, ArrowUpRight } from 'lucide-react';
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
      color: '#6366f1',
      link: '/dashboard/customers',
      change: '+12%',
    },
    {
      name: 'Total Products',
      value: stats.products,
      icon: Package,
      color: '#10b981',
      link: '/dashboard/products',
      change: '+8%',
    },
    {
      name: 'Total Invoices',
      value: stats.invoices,
      icon: FileText,
      color: '#d4af37',
      link: '/dashboard/invoices',
      change: '+23%',
    },
  ];

  const quickActions = [
    { name: 'New Customer', link: '/dashboard/customers/new', icon: Users },
    { name: 'New Product', link: '/dashboard/products/new', icon: Package },
    { name: 'New Invoice', link: '/dashboard/invoices/new', icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 rounded-full"
          style={{
            borderColor: 'var(--color-surface-light)',
            borderTopColor: 'var(--color-gold)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          Dashboard
        </h1>
        <p className="text-lg" style={{ color: 'var(--color-text-muted)' }}>
          Welcome back to your invoice management system
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link to={card.link}>
                <motion.div
                  className="glass rounded-2xl p-6 card-hover relative overflow-hidden"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Background gradient */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
                    style={{ background: card.color }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="p-3 rounded-xl"
                        style={{ background: `${card.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: card.color }} />
                      </div>
                      <div className="flex items-center space-x-1 text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                        <TrendingUp className="w-4 h-4" />
                        <span>{card.change}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        {card.name}
                      </p>
                      <p className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                        {card.value}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center text-sm font-medium" style={{ color: card.color }}>
                      <span>View details</span>
                      <ArrowUpRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="glass rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Quick Actions
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Create new records instantly
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              >
                <Link to={action.link}>
                  <motion.div
                    className="p-6 rounded-xl border transition-all duration-300 group"
                    style={{
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-surface-light)',
                    }}
                    whileHover={{
                      scale: 1.02,
                      borderColor: 'var(--color-gold)',
                      background: 'rgba(212, 175, 55, 0.05)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className="p-3 rounded-lg transition-colors"
                          style={{ background: 'rgba(212, 175, 55, 0.1)' }}
                        >
                          <Icon className="w-5 h-5" style={{ color: 'var(--color-gold)' }} />
                        </div>
                        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                          {action.name}
                        </span>
                      </div>
                      <Plus
                        className="w-5 h-5 transition-transform group-hover:rotate-90"
                        style={{ color: 'var(--color-gold)' }}
                      />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              System Status
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              All systems operational
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ background: 'var(--color-success)' }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
              Online
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
