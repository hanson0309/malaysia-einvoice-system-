import { useState } from 'react';
import { Send, CheckCircle, XCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { irbApi } from '../lib/api';

interface SubmitToIRBButtonProps {
  invoiceId: string;
  currentStatus: string;
  onSuccess?: () => void;
}

export default function SubmitToIRBButton({ invoiceId, currentStatus, onSuccess }: SubmitToIRBButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!confirm('Submit this invoice to MyInvois (IRB)?')) return;

    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const response = await irbApi.submitInvoice(invoiceId);
      console.log('IRB submission response:', response.data);

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('IRB submission error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to submit to IRB';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't show button if already submitted
  if (currentStatus === 'submitted' || currentStatus === 'validated') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '0.5rem',
        color: '#34d399',
        fontSize: '0.875rem'
      }}>
        <CheckCircle style={{ width: '16px', height: '16px' }} />
        Submitted to IRB
      </div>
    );
  }

  return (
    <div>
      <motion.button
        onClick={handleSubmit}
        disabled={isSubmitting}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: isSubmitting
            ? 'rgba(139, 92, 246, 0.3)'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '0.5rem',
          color: '#a78bfa',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: isSubmitting ? 'not-allowed' : 'pointer'
        }}
        whileHover={!isSubmitting ? { scale: 1.05 } : {}}
        whileTap={!isSubmitting ? { scale: 0.95 } : {}}
      >
        {isSubmitting ? (
          <>
            <Loader style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
            Submitting...
          </>
        ) : success ? (
          <>
            <CheckCircle style={{ width: '16px', height: '16px' }} />
            Submitted!
          </>
        ) : (
          <>
            <Send style={{ width: '16px', height: '16px' }} />
            Submit to IRB
          </>
        )}
      </motion.button>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            color: '#f87171',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            maxWidth: '400px'
          }}
        >
          <XCircle style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '0.125rem' }} />
          <div>{error}</div>
        </motion.div>
      )}
    </div>
  );
}
