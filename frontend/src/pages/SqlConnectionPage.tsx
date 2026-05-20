import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Wifi, WifiOff, Eye, EyeOff, RefreshCw,
  Play, CheckCircle2, AlertCircle, Save, Trash2, ChevronDown, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sqlConnectionApi, type SqlConnectionConfig, type SqlSyncResult, type SqlDetectResult } from '../lib/api';

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

const card: React.CSSProperties = {
  background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.15)',
  borderRadius: '1rem', padding: '1.5rem', backdropFilter: 'blur(10px)',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem',
  background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: '0.5rem', color: '#f1f5f9', fontSize: '0.875rem', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem', display: 'block',
};
const reqStar: React.CSSProperties = { color: '#f87171', marginLeft: 2 };

// ─── Mapping row component ───────────────────────────────────────────────────

function MapRow({
  label, required, hint, value, onChange,
}: { label: string; required?: boolean; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'contents' }}>
      <div style={{ padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: '0.82rem', color: required ? '#cbd5e1' : '#94a3b8' }}>
          {label}
          {required && <span style={reqStar}>*</span>}
        </span>
        {hint && <span style={{ fontSize: '0.72rem', color: '#475569' }}>({hint})</span>}
      </div>
      <div style={{ padding: '0.25rem 0' }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`SQL column name`}
          style={{ ...inp, padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
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
    return <div style={{ padding: '2rem', color: '#94a3b8' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <Database size={22} color="#8b5cf6" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>SQL Database Link</h1>
          {existing && (
            <span style={{
              padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
              background: existing.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
              color: existing.is_active ? '#86efac' : '#94a3b8',
              border: `1px solid ${existing.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(148,163,184,0.2)'}`,
            }}>
              {existing.is_active ? '● Connected' : '○ Inactive'}
            </span>
          )}
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Link your MySQL/MariaDB database to automatically import invoices. Each account has its own separate connection.
        </p>
      </motion.div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid rgba(148,163,184,0.15)', paddingBottom: '0' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.6rem 1.1rem', background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid #8b5cf6' : '2px solid transparent',
            color: tab === t ? '#a78bfa' : '#64748b',
            fontWeight: tab === t ? 600 : 500, fontSize: '0.875rem', cursor: 'pointer',
            marginBottom: '-1px', transition: 'all 0.2s',
          }}>
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

          {/* ── TAB 1: Connection ─────────────────────────────────────────── */}
          {tab === 'Connection' && (
            <div style={card}>
              <h3 style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>
                MySQL / MariaDB Connection
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={lbl}>Host / IP Address<span style={reqStar}>*</span></label>
                  <input value={form.host} onChange={(e) => setF('host', e.target.value)}
                    placeholder="e.g. 127.0.0.1 or myserver.com" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Port</label>
                  <input type="number" value={form.port} onChange={(e) => setF('port', parseInt(e.target.value) || 3306)}
                    style={inp} />
                </div>
                <div>
                  <label style={lbl}>Database Name<span style={reqStar}>*</span></label>
                  <input value={form.database} onChange={(e) => setF('database', e.target.value)}
                    placeholder="e.g. mycompany_db" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Username<span style={reqStar}>*</span></label>
                  <input value={form.username} onChange={(e) => setF('username', e.target.value)}
                    placeholder="e.g. root" style={inp} />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={lbl}>
                  Password{!SQL_DEBUG && <span style={reqStar}>*</span>}
                </label>
                {SQL_DEBUG && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={noPassword} onChange={(e) => { setNoPassword(e.target.checked); if (e.target.checked) setF('password', ''); }}
                      style={{ width: 15, height: 15, accentColor: '#8b5cf6' }} />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No password (local MySQL / XAMPP root with no password)</span>
                  </label>
                )}
                {!noPassword && (
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} value={form.password}
                      onChange={(e) => setF('password', e.target.value)}
                      placeholder={
                        existing
                          ? SQL_DEBUG
                            ? '••••••••  (leave blank = keep saved)'
                            : 'Enter new password to update'
                          : 'Enter password'
                      }
                      style={{ ...inp, paddingRight: '2.5rem' }} />
                    <button onClick={() => setShowPw(!showPw)} style={{
                      position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                      display: 'flex', alignItems: 'center',
                    }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <motion.button onClick={handleTest} disabled={testing || detecting}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1.1rem',
                    background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
                    borderRadius: '0.5rem', color: '#a78bfa', fontSize: '0.875rem',
                    fontWeight: 600, cursor: (testing || detecting) ? 'not-allowed' : 'pointer',
                  }}>
                  {testing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Wifi size={15} />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </motion.button>

                <motion.button onClick={handleDetect} disabled={detecting || testing}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1.1rem',
                    background: detecting ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.4)',
                    borderRadius: '0.5rem', color: '#fbbf24', fontSize: '0.875rem',
                    fontWeight: 600, cursor: (detecting || testing) ? 'not-allowed' : 'pointer',
                  }}>
                  {detecting ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Database size={15} />}
                  {detecting ? 'Detecting...' : '✨ Auto Detect Tables'}
                </motion.button>
              </div>

              {testResult && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.8rem',
                    background: testResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: testResult.success ? '#86efac' : '#fca5a5',
                  }}>
                  {testResult.success ? <CheckCircle2 size={14} /> : <WifiOff size={14} />}
                  {testResult.message}
                </motion.div>
              )}

              {detectResult && detectResult.detected.invoice_table && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: '0.5rem', padding: '0.65rem 0.9rem', borderRadius: '0.5rem',
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.8rem' }}>
                  <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>✨ Detected {detectResult.tables.length} table(s)</div>
                  <div style={{ color: '#94a3b8' }}>Best match: <strong style={{ color: '#fcd34d' }}>{detectResult.detected.invoice_table}</strong></div>
                  <div style={{ color: '#64748b', marginTop: 2 }}>Query and column mapping have been filled in — check the tabs above, then click Save.</div>
                </motion.div>
              )}

              {SQL_DEBUG && (
                <div style={{
                  marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem',
                  background: 'rgba(15,23,42,0.5)', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6,
                }}>
                  💡 <strong style={{ color: '#94a3b8' }}>Testing locally?</strong> Use host <code style={{ color: '#a78bfa' }}>127.0.0.1</code> with port <code style={{ color: '#a78bfa' }}>3306</code>.
                  Install <strong style={{ color: '#94a3b8' }}>XAMPP</strong> or <strong style={{ color: '#94a3b8' }}>MySQL Community Server</strong> on your machine, create a test database, and connect here.
                  The backend server connects to this MySQL — so the host is from the server's perspective.
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: SQL Query ──────────────────────────────────────────── */}
          {tab === 'SQL Query' && (
            <div style={card}>
              <h3 style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem' }}>
                SQL Query Configuration
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>
                Write a SELECT query that returns invoice data. Use <code style={{ color: '#a78bfa' }}>?</code> as a placeholder for the last sync date (optional — enables incremental sync).
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ ...lbl, color: '#cbd5e1' }}>Invoice Query<span style={reqStar}>*</span></label>
                <textarea value={form.invoice_query}
                  onChange={(e) => setF('invoice_query', e.target.value)}
                  rows={5}
                  placeholder={`SELECT inv_no, inv_date, cust_name, cust_brn, subtotal, tax_amt, total\nFROM invoices\nWHERE created_at > ?\nORDER BY created_at ASC`}
                  style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.5 }}
                />
                <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Tip: Join your invoice and customer tables in one query. The <code>?</code> is replaced with the last sync timestamp automatically.
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={lbl}>Invoice Lines Sub-Query <span style={{ color: '#475569' }}>(optional — for separate line items table)</span></label>
                <textarea value={form.invoice_lines_query}
                  onChange={(e) => setF('invoice_lines_query', e.target.value)}
                  rows={3}
                  placeholder={`SELECT item_desc, qty, unit_price, tax_code, tax_rate\nFROM invoice_lines\nWHERE invoice_id = ?`}
                  style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.5 }}
                />
                <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  If set, the <code>?</code> is replaced with the invoice's ID column value. Set the <strong>Invoice ID / PK column</strong> in Column Mapping too.
                  If left blank, one invoice line is created from the header row itself.
                </p>
              </div>

              {existing && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <motion.button onClick={handlePreview} disabled={previewing}
                    whileHover={{ scale: previewing ? 1 : 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.55rem 1.1rem',
                      background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: '0.5rem', color: '#60a5fa', fontSize: '0.875rem',
                      fontWeight: 600, cursor: previewing ? 'not-allowed' : 'pointer',
                    }}>
                    {previewing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Eye size={15} />}
                    {previewing ? 'Loading...' : 'Preview 5 rows'}
                  </motion.button>

                  {previewError && (
                    <div style={{
                      padding: '0.4rem 0.75rem', background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem',
                      color: '#fca5a5', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    }}>
                      <AlertCircle size={14} />{previewError}
                    </div>
                  )}
                </div>
              )}

              {!existing && (
                <p style={{ color: '#475569', fontSize: '0.8rem' }}>Save the connection first to enable Preview.</p>
              )}

              {previewRows && previewRows.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ marginTop: '1rem', overflowX: 'auto' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    Preview — {previewRows.length} rows returned. Column names to use in mapping:
                  </p>
                  <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid rgba(148,163,184,0.15)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(15,23,42,0.7)' }}>
                          {Object.keys(previewRows[0]).map((col) => (
                            <th key={col} style={{ padding: '0.4rem 0.6rem', color: '#a78bfa', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} style={{ padding: '0.35rem 0.6rem', color: '#cbd5e1', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {val === null ? <span style={{ color: '#475569' }}>NULL</span> : String(val)}
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
                <p style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.8rem' }}>Query returned 0 rows.</p>
              )}
            </div>
          )}

          {/* ── TAB 3: Column Mapping ─────────────────────────────────────── */}
          {tab === 'Column Mapping' && (
            <div style={card}>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                Enter the <strong style={{ color: '#94a3b8' }}>SQL column name</strong> that corresponds to each field.
                Fields marked <span style={reqStar}>*</span> are required. Leave optional fields blank to use defaults.
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
                <div key={section.key} style={{ marginBottom: '0.75rem', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '0.65rem', overflow: 'hidden' }}>
                  <button
                    onClick={() => setMapOpen((o) => ({ ...o, [section.key]: !o[section.key] }))}
                    style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(15,23,42,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}
                  >
                    {mapOpen[section.key] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{section.title}</span>
                  </button>
                  {mapOpen[section.key] && (
                    <div style={{ padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
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
          )}

          {/* ── TAB 4: Auto Sync ──────────────────────────────────────────── */}
          {tab === 'Auto Sync' && (
            <div style={card}>
              {/* Mode badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <h3 style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem', margin: 0 }}>Sync Settings</h3>
                <span style={{
                  padding: '0.2rem 0.7rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700,
                  background: form.auto_sync_enabled ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                  color: form.auto_sync_enabled ? '#86efac' : '#fbbf24',
                  border: `1px solid ${form.auto_sync_enabled ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'}`,
                }}>
                  {form.auto_sync_enabled ? '● Production Mode' : '○ Testing / Manual Mode'}
                </span>
              </div>

              {/* Monthly schedule info */}
              <div style={{
                padding: '0.75rem 1rem', marginBottom: '1rem',
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '0.65rem', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6,
              }}>
                📅 <strong style={{ color: '#c4b5fd' }}>Monthly auto-sync schedule</strong><br />
                When enabled, the system automatically syncs your SQL invoices on the <strong style={{ color: '#e2e8f0' }}>1st–7th of each month</strong> (once per month, incremental — only new rows since last sync).
                <br />Outside that window, use <strong style={{ color: '#e2e8f0' }}>Manual Sync</strong> below to pull data anytime.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1rem',
                  background: 'rgba(15,23,42,0.5)', borderRadius: '0.75rem', cursor: 'pointer',
                  border: `1px solid ${form.auto_sync_enabled ? 'rgba(34,197,94,0.25)' : 'rgba(148,163,184,0.1)'}`,
                }}>
                  <input type="checkbox" checked={form.auto_sync_enabled}
                    onChange={(e) => setF('auto_sync_enabled', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#8b5cf6', marginTop: 2 }} />
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>Enable monthly auto-sync</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>
                      System syncs automatically on the 1st–7th of each month.
                    </div>
                  </div>
                </label>

                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1rem',
                  background: 'rgba(15,23,42,0.5)', borderRadius: '0.75rem', cursor: 'pointer',
                  border: `1px solid ${!form.is_active ? 'rgba(239,68,68,0.25)' : 'rgba(148,163,184,0.1)'}`,
                }}>
                  <input type="checkbox" checked={form.is_active}
                    onChange={(e) => setF('is_active', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#8b5cf6', marginTop: 2 }} />
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>Connection enabled</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>
                      Uncheck to pause ALL syncs (both auto and manual) without deleting your configuration. Useful when the SQL server is offline for maintenance.
                    </div>
                  </div>
                </label>
              </div>

              {existing && (
                <div style={{
                  padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.4)',
                  borderRadius: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.7,
                }}>
                  <div><strong style={{ color: '#cbd5e1' }}>Last sync:</strong>{' '}{existing.last_sync_at ? new Date(existing.last_sync_at).toLocaleString() : 'Never'}</div>
                  {existing.last_sync_status && <div><strong style={{ color: '#cbd5e1' }}>Status:</strong> {existing.last_sync_status}</div>}
                  {existing.last_sync_count !== undefined && <div><strong style={{ color: '#cbd5e1' }}>Last imported:</strong> {existing.last_sync_count} invoices</div>}
                </div>
              )}

              {/* Manual sync */}
              {existing && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Manual Sync</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <motion.button onClick={() => handleSync(false)} disabled={syncing}
                      whileHover={{ scale: syncing ? 1 : 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.55rem 1.1rem',
                        background: syncing ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.35)',
                        borderRadius: '0.5rem', color: '#86efac', fontSize: '0.875rem',
                        fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer',
                      }}>
                      {syncing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
                      {syncing ? 'Syncing...' : 'Sync Now (incremental)'}
                    </motion.button>

                    <motion.button onClick={() => handleSync(true)} disabled={syncing}
                      whileHover={{ scale: syncing ? 1 : 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.55rem 1.1rem',
                        background: syncing ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.12)',
                        border: '1px solid rgba(59,130,246,0.35)',
                        borderRadius: '0.5rem', color: '#60a5fa', fontSize: '0.875rem',
                        fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer',
                      }}>
                      <RefreshCw size={15} />
                      Sync All (full reimport)
                    </motion.button>

                    <motion.button onClick={handleResetSync} disabled={syncing}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.55rem 1.1rem',
                        background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)',
                        borderRadius: '0.5rem', color: '#64748b', fontSize: '0.8rem',
                        fontWeight: 500, cursor: syncing ? 'not-allowed' : 'pointer',
                      }}>
                      Reset sync date
                    </motion.button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.4rem' }}>
                    <strong style={{ color: '#64748b' }}>Incremental</strong> = only new rows since last sync.{' '}
                    <strong style={{ color: '#64748b' }}>Full reimport</strong> = scans all rows (already-imported invoices are skipped automatically).
                  </p>

                  {syncResult && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      style={{
                        marginTop: '0.75rem', padding: '0.75rem 1rem',
                        background: syncResult.errors > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                        border: `1px solid ${syncResult.errors > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.25)'}`,
                        borderRadius: '0.5rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.7,
                      }}>
                      <div style={{ color: '#86efac' }}>✓ Imported: {syncResult.imported}</div>
                      <div style={{ color: '#94a3b8' }}>⤳ Skipped (already exists): {syncResult.skipped}</div>
                      {syncResult.errors > 0 && <div style={{ color: '#fca5a5' }}>✗ Errors: {syncResult.errors}</div>}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <motion.button onClick={handleSave} disabled={saving}
            whileHover={{ scale: saving ? 1 : 1.03 }} whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.65rem 1.4rem',
              background: saving ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: '0.65rem', color: '#a78bfa', fontSize: '0.875rem',
              fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            }}>
            {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </motion.button>
        </div>

        {existing && (
          <motion.button onClick={handleDelete}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.65rem 1.1rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '0.65rem', color: '#fca5a5', fontSize: '0.875rem',
              fontWeight: 600, cursor: 'pointer',
            }}>
            <Trash2 size={15} />Remove Connection
          </motion.button>
        )}
      </div>
    </div>
  );
}
