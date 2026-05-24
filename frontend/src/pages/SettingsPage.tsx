import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Layers, Play, RefreshCw, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import {
  autoConsolidateApi,
  type AutoConsolidateSettings,
  type AutoConsolidateRunSummary,
  type JobProgress,
} from '../lib/api';
import '../styles/elegant-theme.css';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AutoConsolidateSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastSummary, setLastSummary] = useState<AutoConsolidateRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await autoConsolidateApi.getSettings();
      setSettings(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof AutoConsolidateSettings>(
    key: K,
    value: AutoConsolidateSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      const res = await autoConsolidateApi.updateSettings({
        enabled: settings.enabled,
        day: settings.day,
        batchSize: settings.batchSize,
      });
      setSettings(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Poll progress endpoint while running (1s) or in background (10s for server-side auto runs)
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await autoConsolidateApi.getProgress();
        const p = res.data;
        setProgress(p);
        if (p.running || (p.total && p.total > 0)) {
          setShowProgress(true);
        }
      } catch {}
    };

    if (pollRef.current) clearInterval(pollRef.current);
    fetchProgress();
    pollRef.current = setInterval(fetchProgress, running ? 1000 : 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [running]);

  const handleRun = async (dryRun: boolean) => {
    try {
      setRunning(true);
      setError(null);
      setLastSummary(null);
      const res = await autoConsolidateApi.run(dryRun);

      if (dryRun) {
        // Dry-run returns summary directly
        setLastSummary(res.data as any);
        setRunning(false);
      } else {
        // Non-dry-run returns {queued:true} immediately; poll until done
        setShowProgress(true);
        // polling effect already started by setRunning(true), detect completion there
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to run auto-consolidation');
      setRunning(false);
    }
  };

  // Detect job completion via polling: when running=true and poll returns running:false with processed>0
  useEffect(() => {
    if (!running) return;
    if (!progress) return;
    if (!progress.running && (progress.total ?? 0) > 0) {
      // Job finished
      setRunning(false);
      loadSettings();
    }
  }, [progress, running]);

  return (
    <div className="elegant-page">
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
              Settings
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Configure automatic consolidation for previous-month invoices.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sharp)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} />
          {error}
        </motion.div>
      )}

      {loading || !settings ? (
        <div className="elegant-loading">
          <motion.div
            className="elegant-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      ) : (
        <motion.div
          className="elegant-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--elegant-text-primary)', marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>
              Auto-Consolidate to MyInvois
            </h2>
            <p style={{ color: 'var(--elegant-text-muted)', fontSize: '0.85rem' }}>
              On the configured day each month (1st-7th), the server automatically picks up all
              draft invoices issued in the previous month and submits them to IRB in batches.
              This runs server-side regardless of whether you are logged in.
            </p>
          </div>

          {/* Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'var(--elegant-overlay)',
              borderRadius: 'var(--radius-sharp)',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
          >
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => updateField('enabled', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--elegant-accent-purple)' }}
            />
            <span style={{ color: 'var(--elegant-text-primary)', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
              Enable automatic monthly consolidation
            </span>
          </label>

          {/* Day + Batch Size */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label className="elegant-label">
                <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                Trigger day of month (1-7)
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={settings.day}
                onChange={(e) => updateField('day', Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
                className="elegant-input"
              />
            </div>
            <div>
              <label className="elegant-label">
                <Layers size={14} style={{ display: 'inline', marginRight: 4 }} />
                Batch size (invoices per chunk)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.batchSize}
                onChange={(e) =>
                  updateField('batchSize', Math.max(1, Math.min(100, Number(e.target.value) || 1)))
                }
                className="elegant-input"
              />
            </div>
          </div>

          {/* Last run info */}
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--elegant-overlay)',
              borderRadius: 'var(--radius-sharp)',
              marginBottom: '1.25rem',
              fontSize: '0.8rem',
              color: 'var(--elegant-text-muted)',
            }}
          >
            <div>
              <strong style={{ color: 'var(--elegant-text-secondary)' }}>Last run:</strong>{' '}
              {settings.lastRunAt ? new Date(settings.lastRunAt).toLocaleString() : 'never'}
            </div>
            {settings.lastStatus && (
              <div style={{ marginTop: 4 }}>
                <strong style={{ color: 'var(--elegant-text-secondary)' }}>Status:</strong> {settings.lastStatus}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <motion.button
              onClick={handleSave}
              disabled={saving}
              className="elegant-btn elegant-btn-secondary"
              style={{ fontSize: '0.875rem', padding: '0.65rem 1.25rem' }}
              whileHover={!saving ? { y: -2 } : {}}
              whileTap={!saving ? { scale: 0.98 } : {}}
            >
              {saving ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}
              {saving ? 'Saving...' : 'Save settings'}
            </motion.button>

            <motion.button
              onClick={() => handleRun(true)}
              disabled={running}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                background: 'rgba(148, 163, 184, 0.1)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: 'var(--radius-sharp)',
                color: 'var(--elegant-text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: running ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
              }}
              whileHover={!running ? { y: -2, background: 'rgba(148, 163, 184, 0.15)' } : {}}
              whileTap={!running ? { scale: 0.98 } : {}}
            >
              <RefreshCw size={16} />
              Preview (dry-run)
            </motion.button>

            <motion.button
              onClick={() => handleRun(false)}
              disabled={running}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                background: running ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: 'var(--radius-sharp)',
                color: '#86efac',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: running ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
              }}
              whileHover={!running ? { y: -2, background: 'rgba(34, 197, 94, 0.2)' } : {}}
              whileTap={!running ? { scale: 0.98 } : {}}
            >
              <Play size={16} />
              {running ? 'Running...' : 'Run now'}
            </motion.button>
          </div>

          {/* Last run summary */}
          {lastSummary && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '1.25rem',
                padding: '1rem',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '0.65rem',
                border: '1px solid rgba(148,163,184,0.15)',
              }}
            >
              <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '0.5rem' }}>
                Run summary — {lastSummary.monthLabel}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.7 }}>
                <div>Candidates: {lastSummary.totalCandidates}</div>
                <div>
                  Batches: {lastSummary.batches} (size {lastSummary.batchSize})
                </div>
                <div style={{ color: '#86efac' }}>Succeeded: {lastSummary.succeeded}</div>
                <div style={{ color: '#fca5a5' }}>Failed: {lastSummary.failed}</div>
                {lastSummary.error && (
                  <div style={{ color: '#fca5a5', marginTop: 4 }}>Error: {lastSummary.error}</div>
                )}
              </div>
              {lastSummary.results.length > 0 && (
                <details style={{ marginTop: '0.75rem' }}>
                  <summary style={{ cursor: 'pointer', color: '#cbd5e1', fontSize: '0.85rem' }}>
                    Per-invoice results ({lastSummary.results.length})
                  </summary>
                  <ul style={{ marginTop: 8, paddingLeft: 16, color: '#94a3b8', fontSize: '0.8rem' }}>
                    {lastSummary.results.map((r) => (
                      <li key={r.invoiceId}>
                        {r.invoiceNumber}:{' '}
                        <span style={{ color: r.success ? '#86efac' : '#fca5a5' }}>
                          {r.success ? r.status || 'submitted' : r.error || 'failed'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </motion.div>
          )}

          {/* ── Submission Progress Bar (bottom of card) ── */}
          <AnimatePresence>
            {showProgress && progress && (progress.total ?? 0) > 0 && (
              <SubmissionProgressBar
                progress={progress}
                onDismiss={() => setShowProgress(false)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ── SubmissionProgressBar ─────────────────────────────────────────────────────

interface ProgressBarProps {
  progress: JobProgress;
  onDismiss: () => void;
}

function SubmissionProgressBar({ progress, onDismiss }: ProgressBarProps) {
  const total = progress.total ?? 0;
  const processed = progress.processed ?? 0;
  const succeeded = progress.succeeded ?? 0;
  const failed = progress.failed ?? 0;
  const currentBatch = progress.currentBatch ?? 0;
  const batches = progress.batches ?? 0;
  const isRunning = progress.running;

  const pct = total > 0 ? Math.round((processed / total) * 100) : (isRunning ? 0 : 100);
  const isComplete = !isRunning;

  const barColor = isComplete
    ? failed > 0
      ? 'linear-gradient(90deg, #22c55e, #f97316)'
      : 'linear-gradient(90deg, #22c55e, #16a34a)'
    : 'linear-gradient(90deg, #3b82f6, #8b5cf6)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
      style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: '0.75rem',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isRunning ? (
            <Loader2
              size={15}
              style={{ color: '#60a5fa', animation: 'spin 1s linear infinite' }}
            />
          ) : (
            <CheckCircle2 size={15} style={{ color: failed > 0 ? '#fb923c' : '#4ade80' }} />
          )}
          <span style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>
            {isRunning
              ? `Submitting to MyInvois${progress.source === 'auto' ? ' (auto)' : ''}…`
              : `Submission complete${progress.source === 'auto' ? ' (auto)' : ''}`}
          </span>
        </div>
        {!isRunning && (
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              padding: 2,
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Progress bar track */}
      <div
        style={{
          position: 'relative',
          height: '6px',
          background: 'rgba(148,163,184,0.15)',
          borderRadius: '9999px',
          overflow: 'hidden',
          marginBottom: '0.6rem',
        }}
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            background: barColor,
            borderRadius: '9999px',
          }}
        />
        {/* Shimmer overlay while running */}
        {isRunning && (
          <motion.div
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '40%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            }}
          />
        )}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.78rem',
          color: '#94a3b8',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.88rem' }}>
          <strong style={{ color: '#f1f5f9', fontSize: '1rem' }}>{processed}</strong>
          <span style={{ color: '#64748b' }}>/{total}</span>
          {' '}invoices
        </span>
        {succeeded > 0 && (
          <span style={{ color: '#86efac' }}>✓ {succeeded}</span>
        )}
        {failed > 0 && (
          <span style={{ color: '#fca5a5' }}>✗ {failed} failed</span>
        )}
        {batches > 1 && (
          <span style={{ color: '#475569', fontSize: '0.72rem' }}>
            batch {isRunning ? currentBatch : batches}/{batches}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: '#64748b' }}>{pct}%</span>
      </div>
    </motion.div>
  );
}
