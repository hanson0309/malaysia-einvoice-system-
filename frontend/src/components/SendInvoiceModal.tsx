import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { invoiceApi, type SendInvoiceData } from '../lib/api';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    _id: string;
    invoice_number: string;
    total_amount: number;
  };
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  onSuccess: () => void;
}

export default function SendInvoiceModal({
  isOpen,
  onClose,
  invoice,
  customer,
  onSuccess,
}: SendInvoiceModalProps) {
  // State management
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp' | 'both'>('email');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSendMethod('email');
      setIsSending(false);
      setError(null);
      setWhatsappLink(null);
      setEmailSubject('');
      setEmailMessage('');
      setWhatsappMessage('');
    }
  }, [isOpen]);

  // Handle send function
  const handleSend = async () => {
    setError(null);
    setIsSending(true);

    try {
      const data: SendInvoiceData = {
        send_method: sendMethod,
        email_subject: emailSubject || undefined,
        email_message: emailMessage || undefined,
        whatsapp_message: whatsappMessage || undefined,
      };

      const response = await invoiceApi.send(invoice._id, data);

      // Handle WhatsApp link if present
      if (response.data.data.whatsapp_link) {
        setWhatsappLink(response.data.data.whatsapp_link);
      }

      // If email or both methods were used and email was sent, show alert and close
      if ((sendMethod === 'email' || sendMethod === 'both') && response.data.data.email_sent) {
        alert('Invoice sent successfully!');
        onSuccess();
        onClose();
      }

      // If WhatsApp-only method was used and link was generated, close modal
      if (sendMethod === 'whatsapp' && response.data.data.whatsapp_link) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to send invoice';
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '1.5rem',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '2rem',
                borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                  Send Invoice
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  {invoice.invoice_number} • {customer.name}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  cursor: 'pointer',
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Body - continues in next chunk */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
