import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Wifi, WifiOff, Eye, EyeOff, RefreshCw,
  Play, CheckCircle2, AlertCircle, Save, Trash2, ChevronDown, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sqlConnectionApi, type SqlConnectionConfig, type SqlSyncResult, type SqlDetectResult } from '../lib/api';
import '../styles/elegant-theme.css';

// ─── Constants ──────────────────────────────────────────────────────────────

const TABS = ['Connection', 'SQL Query', 'Column Mapping', 'Auto Sync'] as const;
type Tab = typeof TABS[number];

const EMPTY_MAPPING = {
  invoice: {
    invoice_number: '', issue_date: '', invoice_type: '', due_date: '',
    currency: '', subtotal: '', tax_amount: '', total_amount: '',
    payment_method: '', id_column: '',
  },
  customer: {
    name: '', registration_no: '', id_type: '', email: '', phone: '',
    tin_number: '', address_line1: '', city: '', postcode: '',
    state_code: '', country_code: '', customer_type: '',
  },
  lines: {
    description: '', quantity: '', unit_price: '',
    tax_type: '', tax_rate: '', tax_amount: '', line_total: '',
  },
};

type Mapping = typeof EMPTY_MAPPING;

interface FormState {
  host: string; port: number; database: string; username: string; password: string;
  invoice_query: string; invoice_lines_query: string;
  column_mapping: Mapping;
  auto_sync_enabled: boolean; auto_sync_interval_minutes: number; is_active: boolean;
}

const EMPTY_FORM: FormState = {
  host: '', port: 3306, database: '', username: '', password: '',
  invoice_query: '', invoice_lines_query: '',
  column_mapping: EMPTY_MAPPING,
  auto_sync_enabled: false, auto_sync_interval_minutes: 60, is_active: true,
};

// ─── Styles ──────────────────────────────────────────────────────────────────
// Removed inline styles - using elegant-theme.css classes instead

// ─── Mapping row component ───────────────────────────────────────────────────

function MapRow({
  label, required, hint, value, onChange,
}: { label: string; required?: boolean; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'contents' }}>
      <div style={{ padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: '0.82rem', color: required ? 'var(--elegant-text-primary)' : 'var(--elegant-text-muted)' }}>
          {label}
          {required && <span style={{ color: 'var(--elegant-accent-red-light)', marginLeft: 2 }}>*</span>}
        </span>
        {hint && <span style={{ fontSize: '0.72rem', color: 'var(--elegant-text-tertiary)' }}>({hint})</span>}
      </div>
      <div style={{ padding: '0.25rem 0' }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`SQL column name`}
          className="elegant-form-input"
          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
        />
      </div>
    </div>
  );
}

// ─── Env flag ──────────────────────────────────────────────────────────────
// true  = dev server (npm run dev) → show testing helpers, allow no-password
// false = production build         → require username + password, hide test tips
const SQL_DEBUG = true;

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SqlConnectionPage() {
  const [tab, setTab] = useState<Tab>('Connection');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existing, setExisting] = useState<SqlConnectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SqlSyncResult | null>(null);
  const [mapOpen, setMapOpen] = useState<Record<string, boolean>>({ invoice: true, customer: false, lines: false });
  const [noPassword, setNoPassword] = useState(false && SQL_DEBUG);
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<SqlDetectResult | null>(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await sqlConnectionApi.get();
      const cfg = res.data.data;
      setExisting(cfg);
      if (cfg) {
        setForm({
          host: cfg.host,
          port: cfg.port,
          database: cfg.database,
          username: cfg.username,
          password: '',
          invoice_query: cfg.invoice_query,
          invoice_lines_query: cfg.invoice_lines_query || '',
          column_mapping: {
            invoice: { ...EMPTY_MAPPING.invoice, ...(cfg.column_mapping?.invoice || {}) },
            customer: { ...EMPTY_MAPPING.customer, ...(cfg.column_mapping?.customer || {}) },
            lines: { ...EMPTY_MAPPING.lines, ...(cfg.column_mapping?.lines || {}) },
          },
          auto_sync_enabled: cfg.auto_sync_enabled,
          auto_sync_interval_minutes: cfg.auto_sync_interval_minutes,
          is_active: cfg.is_active,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load SQL config');
    } finally {
      setLoading(false);
    }
  };

  const setF = (key: keyof FormState, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const setMap = (section: keyof Mapping, field: string, val: string) =>
    setForm((f) => ({
      ...f,
      column_mapping: {
        ...f.column_mapping,
        [section]: { ...f.column_mapping[section], [field]: val },
      },
    }));

  const handleSave = async () => {
    if (!form.host || !form.database || !form.username) {
      toast.error('Host, database and username are required'); return;
    }
    if (!SQL_DEBUG && !form.password && !existing) {
      toast.error('Password is required'); return;
    }
    if (!form.invoice_query.trim()) {
      toast.error('Invoice SQL query is required'); return;
    }
    if (!form.column_mapping.invoice.invoice_number || !form.column_mapping.invoice.issue_date) {
      toast.error('Column mapping: Invoice Number and Issue Date are required'); return;
    }
    if (!form.column_mapping.customer.name || !form.column_mapping.customer.registration_no) {
      toast.error('Column mapping: Customer Name and Registration No are required'); return;
    }
    if (!form.column_mapping.lines.description || !form.column_mapping.lines.quantity || !form.column_mapping.lines.unit_price) {
      toast.error('Column mapping: Description, Quantity and Unit Price are required'); return;
    }

    try {
      setSaving(true);
      const payload: any = {
        host: form.host, port: form.port, database: form.database, username: form.username,
        invoice_query: form.invoice_query,
        invoice_lines_query: form.invoice_lines_query || undefined,
        column_mapping: form.column_mapping,
        auto_sync_enabled: form.auto_sync_enabled,
        auto_sync_interval_minutes: form.auto_sync_interval_minutes,
        is_active: form.is_active,
      };
      // Always send password: empty string for no-password MySQL, or user-entered value
      if (!existing || form.password !== '' || noPassword) {
        payload.password = noPassword ? '' : form.password;
      }

      await sqlConnectionApi.save(payload);
      toast.success(existing ? 'SQL connection updated' : 'SQL connection saved');
      setForm((f) => ({ ...f, password: '' }));
      await loadConfig();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getCredentials = () => ({
    host: form.host, port: form.port, database: form.database,
    username: form.username, password: noPassword ? '' : form.password,
  });

  const handleTest = async () => {
    if (!form.host || !form.database || !form.username) {
      setTestResult({ success: false, message: 'Fill in host, database and username first' });
      return;
    }
    setTesting(true); setTestResult(null);
    try {
      // If user has typed a new password OR no-password mode OR no existing config → use form
      if (form.password || noPassword || !existing) {
        const res = await sqlConnectionApi.testNew(getCredentials());
        setTestResult(res.data);
      } else {
        const res = await sqlConnectionApi.testSaved();
        setTestResult(res.data);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.response?.data?.error || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleDetect = async () => {
    if (!form.host || !form.database || !form.username) {
      toast.error('Fill in host, database and username first'); return;
    }
    setDetecting(true); setDetectResult(null);
    try {
      const res = await sqlConnectionApi.detect(getCredentials());
      if (!res.data.success) {
        toast.error(res.data.error || 'Detection failed'); return;
      }
      setDetectResult(res.data);
      const d = res.data.detected;
      // Apply detected query and mapping to form
      setForm((f) => ({
        ...f,
        invoice_query: d.suggested_query || f.invoice_query,
        column_mapping: {
          invoice: { ...EMPTY_MAPPING.invoice, ...d.column_mapping.invoice },
          customer: { ...EMPTY_MAPPING.customer, ...d.column_mapping.customer },
          lines: { ...EMPTY_MAPPING.lines, ...d.column_mapping.lines },
        },
      }));
      // Expand all mapping sections so user can review
      setMapOpen({ invoice: true, customer: true, lines: true });
      toast.success(`Detected table: ${d.invoice_table || 'unknown'} — review the mapping then Save`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Detection failed');
    } finally {
      setDetecting(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true); setPreviewRows(null); setPreviewError(null);
    try {
      const res = await sqlConnectionApi.preview(5);
      if (res.data.success) {
        setPreviewRows(res.data.data);
      } else {
        setPreviewError(res.data.message || 'Preview failed');
      }
    } catch (err: any) {
      setPreviewError(err.response?.data?.error || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSync = async (full = false) => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await sqlConnectionApi.sync(full);
      setSyncResult(res.data);
      if (res.data.imported > 0) toast.success(`${res.data.imported} invoices imported`);
      else toast(res.data.message);
      await loadConfig();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleResetSync = async () => {
    if (!window.confirm('Reset sync date? The next sync will reimport ALL rows (duplicates are still skipped).')) return;
    try {
      await sqlConnectionApi.resetSync();
      toast.success('Sync date reset — click Sync Now to reimport all');
      await loadConfig();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Reset failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this SQL connection? This will not delete any imported invoices.')) return;
    try {
      await sqlConnectionApi.delete();
      toast.success('SQL connection removed');
      setExisting(null); setForm(EMPTY_FORM);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Database size={28} style={{ color: 'var(--elegant-accent-purple)' }} />
              <motion.h1
                className="elegant-title"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                SQL Database Link
              </motion.h1>
              {existing && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: existing.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
                    color: existing.is_active ? '#86efac' : 'var(--elegant-text-muted)',
                    border: `1px solid ${existing.is_active ? 'rgba(34,197,94,0.3)' : 'var(--elegant-border)'}`,
                  }}
                >
                  {existing.is_active ? '● Connected' : '○ Inactive'}
                </motion.span>
              )}
            </div>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Link your MySQL/MariaDB database to automatically import invoices. Each account has its own separate connection.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--elegant-border)',
          paddingBottom: '0',
        }}
      >
        {TABS.map((t, idx) => (
          <motion.button
            key={t}
            onClick={() => setTab(t)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + idx * 0.05 }}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--elegant-accent-purple)' : '2px solid transparent',
              color: tab === t ? 'var(--elegant-text-primary)' : 'var(--elegant-text-muted)',
              fontFamily: 'var(--font-sans)',
              fontWeight: tab === t ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginBottom: '-1px',
              transition: 'all 0.3s ease',
            }}
            whileHover={{ color: 'var(--elegant-text-primary)' }}
          >
            {t}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >

          {/* ── TAB 1: Connection ─────────────────────────────────────────── */}
          {tab === 'Connection' && (
            <div className="elegant-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div className="elegant-card-body" style={{ padding: '2rem' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.25rem',
                    fontWeight: 500,
                    color: 'var(--elegant-text-primary)',
                    marginBottom: '1.5rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  MySQL / MariaDB Connection
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="elegant-form-group">
                    <label className="elegant-form-label">
                      Host / IP Address<span style={{ color: 'var(--elegant-accent-red-light)', marginLeft: 2 }}>*</span>
                    </label>
                    <input
                      value={form.host}
                      onChange={(e) => setF('host', e.target.value)}
                      placeholder="e.g. 127.0.0.1 or myserver.com"
                      className="elegant-form-input"
                    />
                  </div>
                  <div className="elegant-form-group">
                    <label className="elegant-form-label">Port</label>
                    <input
                      type="number"
                      value={form.port}
                      onChange={(e) => setF('port', parseInt(e.target.value) || 3306)}
                      className="elegant-form-input"
                    />
                  </div>
                  <div className="elegant-form-group">
                    <label className="elegant-form-label">
                      Database Name<span style={{ color: 'var(--elegant-accent-red-light)', marginLeft: 2 }}>*</span>
                    </label>
                    <input
                      value={form.database}
                      onChange={(e) => setF('database', e.target.value)}
                      placeholder="e.g. mycompany_db"
                      className="elegant-form-input"
                    />
                  </div>
                  <div className="elegant-form-group">
                    <label className="elegant-form-label">
                      Username<span style={{ color: 'var(--elegant-accent-red-light)', marginLeft: 2 }}>*</span>
                    </label>
                    <input
                      value={form.username}
                      onChange={(e) => setF('username', e.target.value)}
                      placeholder="e.g. root"
                      className="elegant-form-input"
                    />
                  </div>
                </div>

                <div className="elegant-form-group">
                  <label className="elegant-form-label">
                    Password{!SQL_DEBUG && <span style={{ color: 'var(--elegant-accent-red-light)', marginLeft: 2 }}>*</span>}
                  </label>
                  {SQL_DEBUG && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={noPassword}
                        onChange={(e) => { setNoPassword(e.target.checked); if (e.target.checked) setF('password', ''); }}
                        style={{ width: 16, height: 16, accentColor: 'var(--elegant-accent-purple)' }}
                      />
                      <span style={{ fontSize: '0.875rem', color: 'var(--elegant-text-muted)', fontFamily: 'var(--font-sans)' }}>
                        No password (local MySQL / XAMPP root with no password)
                      </span>
                    </label>
                  )}
                  {!noPassword && (
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setF('password', e.target.value)}
                        placeholder={
                          existing
                            ? SQL_DEBUG
                              ? '••••••••  (leave blank = keep saved)'
                              : 'Enter new password to update'
                            : 'Enter password'
                        }
                        className="elegant-form-input"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        onClick={() => setShowPw(!showPw)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--elegant-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                  <motion.button
                    onClick={handleTest}
                    disabled={testing || detecting}
                    className="elegant-btn elegant-btn-secondary"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: (testing || detecting) ? 'not-allowed' : 'pointer',
                      opacity: (testing || detecting) ? 0.6 : 1,
                    }}
                  >
                    {testing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Wifi size={16} />}
                    {testing ? 'Testing...' : 'Test Connection'}
                  </motion.button>

                  <motion.button
                    onClick={handleDetect}
                    disabled={detecting || testing}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 1.25rem',
                      background: detecting ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)',
                      border: '1px solid rgba(245,158,11,0.4)',
                      borderRadius: 'var(--radius-sharp)',
                      color: '#fbbf24',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: (detecting || testing) ? 'not-allowed' : 'pointer',
                      opacity: (detecting || testing) ? 0.6 : 1,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {detecting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Database size={16} />}
                    {detecting ? 'Detecting...' : '✨ Auto Detect Tables'}
                  </motion.button>
                </div>

                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-sharp)',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-sans)',
                      background: testResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      color: testResult.success ? '#86efac' : '#fca5a5',
                    }}
                  >
                    {testResult.success ? <CheckCircle2 size={16} /> : <WifiOff size={16} />}
                    {testResult.message}
                  </motion.div>
                )}

                {detectResult && detectResult.detected.invoice_table && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: '1rem',
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-sharp)',
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '0.5rem' }}>
                      ✨ Detected {detectResult.tables.length} table(s)
                    </div>
                    <div style={{ color: 'var(--elegant-text-muted)' }}>
                      Best match: <strong style={{ color: '#fcd34d' }}>{detectResult.detected.invoice_table}</strong>
                    </div>
                    <div style={{ color: 'var(--elegant-text-tertiary)', marginTop: '0.25rem' }}>
                      Query and column mapping have been filled in — check the tabs above, then click Save.
                    </div>
                  </motion.div>
                )}

                {SQL_DEBUG && (
                  <div
                    style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      borderRadius: 'var(--radius-sharp)',
                      background: 'var(--elegant-overlay)',
                      fontSize: '0.875rem',
                      color: 'var(--elegant-text-tertiary)',
                      lineHeight: 1.6,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    💡 <strong style={{ color: 'var(--elegant-text-muted)' }}>Testing locally?</strong> Use host{' '}
                    <code style={{ color: 'var(--elegant-accent-purple)' }}>127.0.0.1</code> with port{' '}
                    <code style={{ color: 'var(--elegant-accent-purple)' }}>3306</code>.
                    Install <strong style={{ color: 'var(--elegant-text-muted)' }}>XAMPP</strong> or{' '}
                    <strong style={{ color: 'var(--elegant-text-muted)' }}>MySQL Community Server</strong> on your machine,
                    create a test database, and connect here. The backend server connects to this MySQL — so the host is from
                    the server's perspective.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: SQL Query ──────────────────────────────────────────── */}
          {tab === 'SQL Query' && (
            <div className="elegant-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div className="elegant-card-body" style={{ padding: '2rem' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.25rem',
                    fontWeight: 500,
                    color: 'var(--elegant-text-primary)',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  SQL Query Configuration
                </h3>
                <p style={{ color: 'var(--elegant-text-tertiary)', fontSize: '0.875rem', marginBottom: '1.5rem', fontFamily: 'var(--font-sans)' }}>
                  Write a SELECT query that returns invoice data. Use <code style={{ color: 'var(--elegant-accent-purple)' }}>?</code> as a placeholder for the last sync date (optional — enables incremental sync).
                </p>

                <div className="elegant-form-group">
                  <label className="elegant-form-label">
                    Invoice Query<span style={{ color: 'var(--elegant-accent-red-light)', marginLeft: 2 }}>*</span>
                  </label>
                  <textarea
                    value={form.invoice_query}
                    onChange={(e) => setF('invoice_query', e.target.value)}
                    rows={5}
                    placeholder={`SELECT inv_no, inv_date, cust_name, cust_brn, subtotal, tax_amt, total\nFROM invoices\nWHERE created_at > ?\nORDER BY created_at ASC`}
                    className="elegant-form-textarea"
                    style={{ fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: 1.5 }}
                  />
                  <p style={{ color: 'var(--elegant-text-tertiary)', fontSize: '0.8rem', marginTop: '0.5rem', fontFamily: 'var(--font-sans)' }}>
                    Tip: Join your invoice and customer tables in one query. The <code>?</code> is replaced with the last sync timestamp automatically.
                  </p>
                </div>

                <div className="elegant-form-group">
                  <label className="elegant-form-label">
                    Invoice Lines Sub-Query <span style={{ color: 'var(--elegant-text-tertiary)' }}>(optional — for separate line items table)</span>
                  </label>
                  <textarea
                    value={form.invoice_lines_query}
                    onChange={(e) => setF('invoice_lines_query', e.target.value)}
                    rows={3}
                    placeholder={`SELECT item_desc, qty, unit_price, tax_code, tax_rate\nFROM invoice_lines\nWHERE invoice_id = ?`}
                    className="elegant-form-textarea"
                    style={{ fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: 1.5 }}
                  />
                  <p style={{ color: 'var(--elegant-text-tertiary)', fontSize: '0.8rem', marginTop: '0.5rem', fontFamily: 'var(--font-sans)' }}>
                    If set, the <code>?</code> is replaced with the invoice's ID column value. Set the <strong>Invoice ID / PK column</strong> in Column Mapping too.
                    If left blank, one invoice line is created from the header row itself.
                  </p>
                </div>

                {existing && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '1.5rem' }}>
                    <motion.button
                      onClick={handlePreview}
                      disabled={previewing}
                      className="elegant-btn elegant-btn-secondary"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: previewing ? 'not-allowed' : 'pointer',
                        opacity: previewing ? 0.6 : 1,
                      }}
                    >
                      {previewing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Eye size={16} />}
                      {previewing ? 'Loading...' : 'Preview 5 rows'}
                    </motion.button>

                    {previewError && (
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 'var(--radius-sharp)',
                          color: '#fca5a5',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <AlertCircle size={16} />{previewError}
                      </div>
                    )}
                  </div>
                )}

                {!existing && (
                  <p style={{ color: 'var(--elegant-text-tertiary)', fontSize: '0.875rem', marginTop: '1rem', fontFamily: 'var(--font-sans)' }}>
                    Save the connection first to enable Preview.
                  </p>
                )}

                {previewRows && previewRows.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
                    <p style={{ color: 'var(--elegant-text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>
                      Preview — {previewRows.length} rows returned. Column names to use in mapping:
                    </p>
                    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sharp)', border: '1px solid var(--elegant-border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--elegant-overlay)' }}>
                            {Object.keys(previewRows[0]).map((col) => (
                              <th
                                key={col}
                                style={{
                                  padding: '0.75rem',
                                  color: 'var(--elegant-accent-purple)',
                                  textAlign: 'left',
                                  whiteSpace: 'nowrap',
                                  borderBottom: '1px solid var(--elegant-border)',
                                  fontFamily: 'var(--font-sans)',
                                  fontWeight: 600,
                                }}
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--elegant-border)' }}>
                              {Object.values(row).map((val: any, j) => (
                                <td
                                  key={j}
                                  style={{
                                    padding: '0.75rem',
                                    color: 'var(--elegant-text-primary)',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontFamily: 'var(--font-sans)',
                                  }}
                                >
                                  {val === null ? <span style={{ color: 'var(--elegant-text-tertiary)' }}>NULL</span> : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {previewRows && previewRows.length === 0 && (
                  <p style={{ marginTop: '1rem', color: 'var(--elegant-text-tertiary)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>
                    Query returned 0 rows.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: Column Mapping ─────────────────────────────────────── */}
          {tab === 'Column Mapping' && (
            <div className="elegant-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div className="elegant-card-body" style={{ padding: '2rem' }}>
                <p style={{ color: 'var(--elegant-text-tertiary)', fontSize: '0.875rem', marginBottom: '1.5rem', fontFamily: 'var(--font-sans)' }}>
                  Enter the <strong style={{ color: 'var(--elegant-text-muted)' }}>SQL column name</strong> that corresponds to each field.
                  Fields marked <span style={{ color: 'var(--elegant-accent-red-light)' }}>*</span> are required. Leave optional fields blank to use defaults.
                </p>

                {(
                  [
                    {
                      key: 'invoice' as const, title: 'Invoice Fields',
                      fields: [
                        { k: 'invoice_number', label: 'Invoice Number', req: true, hint: 'e.g. inv_no' },
                        { k: 'issue_date', label: 'Issue Date', req: true, hint: 'e.g. inv_date' },
                        { k: 'invoice_type', label: 'Invoice Type', hint: '01/02/03/04 — default 01' },
                        { k: 'due_date', label: 'Due Date', hint: 'optional' },
                        { k: 'currency', label: 'Currency', hint: 'default MYR' },
                        { k: 'subtotal', label: 'Subtotal Amount', hint: 'before tax' },
                        { k: 'tax_amount', label: 'Tax Amount', hint: 'optional' },
                        { k: 'total_amount', label: 'Total Amount', hint: 'incl. tax' },
                        { k: 'payment_method', label: 'Payment Method', hint: 'cash/bank_transfer/card/ewallet' },
                        { k: 'id_column', label: 'Invoice ID / PK column', hint: 'for lines sub-query WHERE' },
                      ],
                    },
                    {
                      key: 'customer' as const, title: 'Customer Fields',
                      fields: [
                        { k: 'name', label: 'Customer Name', req: true },
                        { k: 'registration_no', label: 'Registration No (BRN/NRIC)', req: true },
                        { k: 'id_type', label: 'ID Type', hint: 'NRIC/BRN/PASSPORT — default BRN' },
                        { k: 'customer_type', label: 'Customer Type', hint: 'B2B or B2C — default B2B' },
                        { k: 'email', label: 'Email', hint: 'optional' },
                        { k: 'phone', label: 'Phone', hint: 'optional' },
                        { k: 'tin_number', label: 'TIN Number', hint: 'optional' },
                        { k: 'address_line1', label: 'Address Line 1', hint: 'optional' },
                        { k: 'city', label: 'City', hint: 'optional' },
                        { k: 'postcode', label: 'Postcode', hint: 'optional' },
                        { k: 'state_code', label: 'State Code', hint: 'e.g. 10 = Selangor' },
                        { k: 'country_code', label: 'Country Code', hint: 'default MY' },
                      ],
                    },
                    {
                      key: 'lines' as const, title: 'Line Item Fields',
                      fields: [
                        { k: 'description', label: 'Description', req: true },
                        { k: 'quantity', label: 'Quantity', req: true },
                        { k: 'unit_price', label: 'Unit Price', req: true },
                        { k: 'tax_type', label: 'Tax Type', hint: 'SST/E/Z/SR — default E' },
                        { k: 'tax_rate', label: 'Tax Rate (%)', hint: 'default 0' },
                        { k: 'tax_amount', label: 'Tax Amount', hint: 'optional (auto-calc)' },
                        { k: 'line_total', label: 'Line Total', hint: 'optional (auto-calc)' },
                      ],
                    },
                  ] as const
                ).map((section) => (
                  <div
                    key={section.key}
                    style={{
                      marginBottom: '1rem',
                      border: '1px solid var(--elegant-border)',
                      borderRadius: 'var(--radius-sharp)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => setMapOpen((o) => ({ ...o, [section.key]: !o[section.key] }))}
                      style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        background: 'var(--elegant-overlay)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        color: 'var(--elegant-text-primary)',
                        fontFamily: 'var(--font-sans)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      {mapOpen[section.key] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{section.title}</span>
                    </button>
                    {mapOpen[section.key] && (
                      <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
                        {section.fields.map((f) => (
                          <MapRow key={f.k} label={f.label} required={'req' in f && f.req} hint={f.hint}
                            value={(form.column_mapping[section.key] as any)[f.k] || ''}
                            onChange={(v) => setMap(section.key, f.k, v)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 4: Auto Sync ──────────────────────────────────────────── */}
          {tab === 'Auto Sync' && (
            <div className="elegant-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div className="elegant-card-body" style={{ padding: '2rem' }}>
                {/* Mode badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.25rem',
                      fontWeight: 500,
                      color: 'var(--elegant-text-primary)',
                      margin: 0,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Sync Settings
                  </h3>
                  <span
                    style={{
                      padding: '0.25rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: form.auto_sync_enabled ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                      color: form.auto_sync_enabled ? '#86efac' : '#fbbf24',
                      border: `1px solid ${form.auto_sync_enabled ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'}`,
                    }}
                  >
                    {form.auto_sync_enabled ? '● Production Mode' : '○ Testing / Manual Mode'}
                  </span>
                </div>

                {/* Monthly schedule info */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 'var(--radius-sharp)',
                    fontSize: '0.875rem',
                    color: 'var(--elegant-text-muted)',
                    lineHeight: 1.6,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  📅 <strong style={{ color: '#c4b5fd' }}>Monthly auto-sync schedule</strong>
                  <br />
                  When enabled, the system automatically syncs your SQL invoices on the{' '}
                  <strong style={{ color: 'var(--elegant-text-primary)' }}>1st–7th of each month</strong> (once per month,
                  incremental — only new rows since last sync).
                  <br />
                  Outside that window, use <strong style={{ color: 'var(--elegant-text-primary)' }}>Manual Sync</strong> below to
                  pull data anytime.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: 'var(--elegant-overlay)',
                      borderRadius: 'var(--radius-sharp)',
                      cursor: 'pointer',
                      border: `1px solid ${form.auto_sync_enabled ? 'rgba(34,197,94,0.25)' : 'var(--elegant-border)'}`,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.auto_sync_enabled}
                      onChange={(e) => setF('auto_sync_enabled', e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: 'var(--elegant-accent-purple)', marginTop: 2 }}
                    />
                    <div>
                      <div style={{ color: 'var(--elegant-text-primary)', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'var(--font-sans)' }}>
                        Enable monthly auto-sync
                      </div>
                      <div style={{ color: 'var(--elegant-text-tertiary)', fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>
                        System syncs automatically on the 1st–7th of each month.
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: 'var(--elegant-overlay)',
                      borderRadius: 'var(--radius-sharp)',
                      cursor: 'pointer',
                      border: `1px solid ${!form.is_active ? 'rgba(239,68,68,0.25)' : 'var(--elegant-border)'}`,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setF('is_active', e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: 'var(--elegant-accent-purple)', marginTop: 2 }}
                    />
                    <div>
                      <div style={{ color: 'var(--elegant-text-primary)', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'var(--font-sans)' }}>
                        Connection enabled
                      </div>
                      <div style={{ color: 'var(--elegant-text-tertiary)', fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>
                        Uncheck to pause ALL syncs (both auto and manual) without deleting your configuration. Useful when the SQL
                        server is offline for maintenance.
                      </div>
                    </div>
                  </label>
                </div>

                {existing && (
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      background: 'var(--elegant-overlay)',
                      borderRadius: 'var(--radius-sharp)',
                      fontSize: '0.875rem',
                      color: 'var(--elegant-text-muted)',
                      lineHeight: 1.7,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--elegant-text-primary)' }}>Last sync:</strong>{' '}
                      {existing.last_sync_at ? new Date(existing.last_sync_at).toLocaleString() : 'Never'}
                    </div>
                    {existing.last_sync_status && (
                      <div>
                        <strong style={{ color: 'var(--elegant-text-primary)' }}>Status:</strong> {existing.last_sync_status}
                      </div>
                    )}
                    {existing.last_sync_count !== undefined && (
                      <div>
                        <strong style={{ color: 'var(--elegant-text-primary)' }}>Last imported:</strong> {existing.last_sync_count}{' '}
                        invoices
                      </div>
                    )}
                  </div>
                )}

                {/* Manual sync */}
                {existing && (
                  <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--elegant-border)' }}>
                    <h4
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--elegant-text-primary)',
                        marginBottom: '1rem',
                      }}
                    >
                      Manual Sync
                    </h4>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <motion.button
                        onClick={() => handleSync(false)}
                        disabled={syncing}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1.25rem',
                          background: syncing ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.15)',
                          border: '1px solid rgba(34,197,94,0.35)',
                          borderRadius: 'var(--radius-sharp)',
                          color: '#86efac',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: syncing ? 'not-allowed' : 'pointer',
                          fontFamily: 'var(--font-sans)',
                          opacity: syncing ? 0.6 : 1,
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {syncing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={16} />}
                        {syncing ? 'Syncing...' : 'Sync Now (incremental)'}
                      </motion.button>

                      <motion.button
                        onClick={() => handleSync(true)}
                        disabled={syncing}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1.25rem',
                          background: syncing ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.12)',
                          border: '1px solid rgba(59,130,246,0.35)',
                          borderRadius: 'var(--radius-sharp)',
                          color: '#60a5fa',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: syncing ? 'not-allowed' : 'pointer',
                          fontFamily: 'var(--font-sans)',
                          opacity: syncing ? 0.6 : 1,
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <RefreshCw size={16} />
                        Sync All (full reimport)
                      </motion.button>

                      <motion.button
                        onClick={handleResetSync}
                        disabled={syncing}
                        className="elegant-btn elegant-btn-secondary"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          fontSize: '0.8rem',
                          cursor: syncing ? 'not-allowed' : 'pointer',
                          opacity: syncing ? 0.6 : 1,
                        }}
                      >
                        Reset sync date
                      </motion.button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--elegant-text-tertiary)', marginTop: '0.75rem', fontFamily: 'var(--font-sans)' }}>
                      <strong style={{ color: 'var(--elegant-text-muted)' }}>Incremental</strong> = only new rows since last sync.{' '}
                      <strong style={{ color: 'var(--elegant-text-muted)' }}>Full reimport</strong> = scans all rows
                      (already-imported invoices are skipped automatically).
                    </p>

                    {syncResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          marginTop: '1rem',
                          padding: '1rem 1.25rem',
                          background: syncResult.errors > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                          border: `1px solid ${syncResult.errors > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.25)'}`,
                          borderRadius: 'var(--radius-sharp)',
                          fontSize: '0.875rem',
                          color: 'var(--elegant-text-primary)',
                          lineHeight: 1.7,
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <div style={{ color: '#86efac' }}>✓ Imported: {syncResult.imported}</div>
                        <div style={{ color: 'var(--elegant-text-muted)' }}>⤳ Skipped (already exists): {syncResult.skipped}</div>
                        {syncResult.errors > 0 && <div style={{ color: '#fca5a5' }}>✗ Errors: {syncResult.errors}</div>}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        style={{
          marginTop: '2rem',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          maxWidth: '900px',
          margin: '2rem auto 0',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem' }}>
          <motion.button
            onClick={handleSave}
            disabled={saving}
            className="elegant-btn elegant-btn-primary"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </motion.button>
        </div>

        {existing && (
          <motion.button
            onClick={handleDelete}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 'var(--radius-sharp)',
              color: '#fca5a5',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.3s ease',
            }}
          >
            <Trash2 size={16} />
            Remove Connection
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
