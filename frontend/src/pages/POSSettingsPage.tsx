import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import '../styles/elegant-theme.css';

interface POSSettings {
  _id?: string;
  tenant_id?: string;
  modules: {
    appointment: boolean;
    inventory: boolean;
    multi_cashier: boolean;
    customer_management: boolean;
  };
  business_type: 'retail' | 'service' | 'both';
  invoice_settings: {
    auto_create_on_payment: boolean;
    default_invoice_type: '01' | '02';
    require_customer_for_invoice: boolean;
  };
  hardware: {
    receipt_printer_enabled: boolean;
    barcode_scanner_enabled: boolean;
    cash_drawer_enabled: boolean;
    label_printer_enabled: boolean;
  };
}

export default function POSSettingsPage() {
  const [settings, setSettings] = useState<POSSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/pos/settings');
      setSettings(response.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load settings');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      await api.put('/pos/settings', settings);
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const updateModules = (key: keyof POSSettings['modules'], value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      modules: {
        ...settings.modules,
        [key]: value,
      },
    });
  };

  const updateInvoiceSettings = (key: keyof POSSettings['invoice_settings'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      invoice_settings: {
        ...settings.invoice_settings,
        [key]: value,
      },
    });
  };

  const updateHardware = (key: keyof POSSettings['hardware'], value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      hardware: {
        ...settings.hardware,
        [key]: value,
      },
    });
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

  if (!settings) {
    return (
      <div className="elegant-page">
        <div className="elegant-empty-state">
          <div className="elegant-empty-icon">⚙️</div>
          <h3 className="elegant-empty-title">Failed to load settings</h3>
          <p className="elegant-empty-description">Please try refreshing the page</p>
        </div>
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
              POS Settings
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Configure POS modules and hardware settings
            </motion.p>
          </div>

          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            className="elegant-btn elegant-btn-primary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={!isSaving ? { y: -2 } : {}}
            whileTap={!isSaving ? { scale: 0.98 } : {}}
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </motion.button>
        </div>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Business Type */}
        <motion.div
          className="elegant-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <SettingsIcon size={24} style={{ color: 'var(--elegant-accent-purple)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--elegant-text-primary)', fontFamily: 'var(--font-sans)' }}>
              Business Type
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {(['retail', 'service', 'both'] as const).map((type) => (
              <label
                key={type}
                style={{
                  flex: 1,
                  padding: '1rem',
                  borderRadius: 'var(--radius-sharp)',
                  background: settings.business_type === type
                    ? 'rgba(139, 92, 246, 0.15)'
                    : 'var(--elegant-overlay)',
                  border: settings.business_type === type
                    ? '2px solid var(--elegant-accent-purple)'
                    : 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="business_type"
                  value={type}
                  checked={settings.business_type === type}
                  onChange={(e) => setSettings({ ...settings, business_type: e.target.value as any })}
                  style={{ display: 'none' }}
                />
                <span style={{
                  color: settings.business_type === type ? 'var(--elegant-accent-purple)' : 'var(--elegant-text-muted)',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  fontFamily: 'var(--font-sans)',
                }}>
                  {type}
                </span>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Modules */}
        <motion.div
          className="elegant-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--elegant-text-primary)', marginBottom: '1rem', fontFamily: 'var(--font-sans)' }}>
            Enabled Modules
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(settings.modules).map(([key, value]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sharp)',
                  background: 'var(--elegant-overlay)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: 'var(--elegant-text-primary)', fontWeight: 500, textTransform: 'capitalize', fontFamily: 'var(--font-sans)' }}>
                  {key.replace(/_/g, ' ')}
                </span>
                <div style={{ position: 'relative' }}>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => updateModules(key as keyof POSSettings['modules'], e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    background: value ? '#8b5cf6' : '#475569',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: value ? '26px' : '2px',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Invoice Settings */}
        <motion.div
          className="elegant-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--elegant-text-primary)', marginBottom: '1rem', fontFamily: 'var(--font-sans)' }}>
            Invoice Settings
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              borderRadius: 'var(--radius-sharp)',
              background: 'var(--elegant-overlay)',
              border: 'none',
              cursor: 'pointer',
            }}>
              <span style={{ color: 'var(--elegant-text-primary)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                Auto Create Invoice on Payment
              </span>
              <div style={{ position: 'relative' }}>
                <input
                  type="checkbox"
                  checked={settings.invoice_settings.auto_create_on_payment}
                  onChange={(e) => updateInvoiceSettings('auto_create_on_payment', e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: settings.invoice_settings.auto_create_on_payment ? 'var(--elegant-accent-purple)' : '#475569',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: settings.invoice_settings.auto_create_on_payment ? '26px' : '2px',
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              borderRadius: 'var(--radius-sharp)',
              background: 'var(--elegant-overlay)',
              border: '1px solid var(--elegant-border)',
              cursor: 'pointer',
            }}>
              <span style={{ color: 'var(--elegant-text-primary)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                Require Customer for Invoice
              </span>
              <div style={{ position: 'relative' }}>
                <input
                  type="checkbox"
                  checked={settings.invoice_settings.require_customer_for_invoice}
                  onChange={(e) => updateInvoiceSettings('require_customer_for_invoice', e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: settings.invoice_settings.require_customer_for_invoice ? '#8b5cf6' : '#475569',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: settings.invoice_settings.require_customer_for_invoice ? '26px' : '2px',
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>
            </label>

            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                Default Invoice Type
              </label>
              <select
                value={settings.invoice_settings.default_invoice_type}
                onChange={(e) => updateInvoiceSettings('default_invoice_type', e.target.value)}
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
                <option value="01">01 - Invoice</option>
                <option value="02">02 - Simplified Invoice</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Hardware Settings */}
        <motion.div
          className="elegant-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--elegant-text-primary)', marginBottom: '1rem', fontFamily: 'var(--font-sans)' }}>
            Hardware Configuration
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(settings.hardware).map(([key, value]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sharp)',
                  background: 'var(--elegant-overlay)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: 'var(--elegant-text-primary)', fontWeight: 500, textTransform: 'capitalize', fontFamily: 'var(--font-sans)' }}>
                  {key.replace(/_/g, ' ')}
                </span>
                <div style={{ position: 'relative' }}>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => updateHardware(key as keyof POSSettings['hardware'], e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    background: value ? 'var(--elegant-accent-purple)' : '#475569',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: value ? '26px' : '2px',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </div>
              </label>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
