import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, MessageCircle, Send, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoiceApi, type SendInvoiceData } from '../lib/api';
import WhatsAppLinkButton from './WhatsAppLinkButton';

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

    // Validate customer has required contact info
    if (sendMethod === 'email' || sendMethod === 'both') {
      if (!customer.email) {
        setError('Customer email is required for email delivery');
        return;
      }
    }

    if (sendMethod === 'whatsapp' || sendMethod === 'both') {
      if (!customer.phone) {
        setError('Customer phone number is required for WhatsApp delivery');
        return;
      }
    }

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

      // If email or both methods were used and email was sent, show toast and close
      if ((sendMethod === 'email' || sendMethod === 'both') && response.data.data.email_sent) {
        toast.success('Invoice sent successfully!');
        onSuccess();
        onClose();
      }

      // If WhatsApp-only method was used and link was generated, close modal
      if (sendMethod === 'whatsapp' && response.data.data.whatsapp_link) {
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to send invoice'
        : 'Failed to send invoice';
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

            {/* Body */}
            <div style={{ padding: '2rem' }}>
              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    marginBottom: '1.5rem',
                  }}
                >
                  <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>
                </motion.div>
              )}

              {/* WhatsApp Link Success */}
              {whatsappLink && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(37, 211, 102, 0.1)',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ color: '#10b981', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    WhatsApp link generated successfully!
                  </p>
                  <WhatsAppLinkButton link={whatsappLink} label="Open WhatsApp" />
                </motion.div>
              )}

              {/* Send Method Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
                  Send Method *
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[
                    { value: 'email', icon: Mail, label: 'Email', color: '#8b5cf6' },
                    { value: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: '#25D366' },
                    { value: 'both', icon: Send, label: 'Both', color: '#f59e0b' },
                  ].map((method) => {
                    const Icon = method.icon;
                    const isSelected = sendMethod === method.value;
                    return (
                      <motion.button
                        key={method.value}
                        onClick={() => setSendMethod(method.value as 'email' | 'whatsapp' | 'both')}
                        style={{
                          flex: 1,
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          background: isSelected ? `${method.color}20` : 'rgba(30, 41, 59, 0.5)',
                          border: `2px solid ${isSelected ? method.color : 'rgba(139, 92, 246, 0.2)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Icon style={{ width: '24px', height: '24px', color: isSelected ? method.color : '#94a3b8' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? method.color : '#94a3b8' }}>
                          {method.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Email Fields */}
              {(sendMethod === 'email' || sendMethod === 'both') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: '1.5rem' }}
                >
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                      Email Subject (Optional)
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder={`Invoice #${invoice.invoice_number} from your company`}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(30, 41, 59, 0.9)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#f1f5f9',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                      Email Message (Optional)
                    </label>
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Custom message for the email body..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(30, 41, 59, 0.9)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#f1f5f9',
                        fontSize: '0.875rem',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {/* WhatsApp Message Field */}
              {(sendMethod === 'whatsapp' || sendMethod === 'both') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: '1.5rem' }}
                >
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    WhatsApp Message (Optional)
                  </label>
                  <textarea
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="Custom message for WhatsApp..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#f1f5f9',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                    }}
                  />
                </motion.div>
              )}

              {/* Send Button */}
              <motion.button
                onClick={handleSend}
                disabled={isSending}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  background: isSending
                    ? 'rgba(139, 92, 246, 0.5)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                whileHover={!isSending ? { scale: 1.02 } : {}}
                whileTap={!isSending ? { scale: 0.98 } : {}}
              >
                {isSending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader style={{ width: '20px', height: '20px' }} />
                    </motion.div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send style={{ width: '20px', height: '20px' }} />
                    Send Invoice
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
