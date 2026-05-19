import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

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
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
        Loading settings...
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        Failed to load settings
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
            POS Settings
          </h1>
          <p style={{ color: '#94a3b8' }}>Configure POS modules and hardware settings</p>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            background: isSaving
              ? 'rgba(139, 92, 246, 0.5)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            border: 'none',
            color: 'white',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          whileHover={!isSaving ? { scale: 1.02 } : {}}
          whileTap={!isSaving ? { scale: 0.95 } : {}}
        >
          <Save style={{ width: '20px', height: '20px' }} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </motion.button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Business Type */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '1rem',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <SettingsIcon style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9' }}>Business Type</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {(['retail', 'service', 'both'] as const).map((type) => (
              <label
                key={type}
                style={{
                  flex: 1,
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  background: settings.business_type === type
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'rgba(15, 23, 42, 0.5)',
                  border: settings.business_type === type
                    ? '2px solid rgba(139, 92, 246, 0.5)'
                    : '1px solid rgba(139, 92, 246, 0.3)',
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
                  color: settings.business_type === type ? '#8b5cf6' : '#94a3b8',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}>
                  {type}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Modules */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '1rem',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
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
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: '#f1f5f9', fontWeight: 500, textTransform: 'capitalize' }}>
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
        </div>

        {/* Invoice Settings */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '1rem',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
            Invoice Settings
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              borderRadius: '0.75rem',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              cursor: 'pointer',
            }}>
              <span style={{ color: '#f1f5f9', fontWeight: 500 }}>
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
                  background: settings.invoice_settings.auto_create_on_payment ? '#8b5cf6' : '#475569',
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
              borderRadius: '0.75rem',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              cursor: 'pointer',
            }}>
              <span style={{ color: '#f1f5f9', fontWeight: 500 }}>
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
        </div>

        {/* Hardware Settings */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '1rem',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>
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
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: '#f1f5f9', fontWeight: 500, textTransform: 'capitalize' }}>
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
        </div>
      </div>
    </div>
  );
}
