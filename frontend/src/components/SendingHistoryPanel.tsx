import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Mail, MessageCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { invoiceApi, type SendingHistoryItem } from '../lib/api';
import WhatsAppLinkButton from './WhatsAppLinkButton';

interface SendingHistoryPanelProps {
  invoiceId: string;
}

export default function SendingHistoryPanel({ invoiceId }: SendingHistoryPanelProps) {
  const [history, setHistory] = useState<SendingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [invoiceId]);

  const loadHistory = async () => {
    try {
      const response = await invoiceApi.getSendingHistory(invoiceId);
      setHistory(response.data.data);
    } catch (error) {
      console.error('Failed to load sending history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
        Loading history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#94a3b8',
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '1rem',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
      >
        <AlertCircle style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
        <p>No sending history yet</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.9)',
        borderRadius: '1.5rem',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        padding: '2rem',
      }}
    >
      <h3
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#f1f5f9',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <Clock style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
        Sending History
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {history.map((record, index) => (
          <motion.div
            key={record._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
              padding: '1.5rem',
              borderRadius: '1rem',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {record.send_method === 'email' && <Mail style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />}
                  {record.send_method === 'whatsapp' && <MessageCircle style={{ width: '16px', height: '16px', color: '#25D366' }} />}
                  {record.send_method === 'both' && (
                    <>
                      <Mail style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                      <MessageCircle style={{ width: '16px', height: '16px', color: '#25D366' }} />
                    </>
                  )}
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9', textTransform: 'capitalize' }}>
                    {record.send_method === 'both' ? 'Email + WhatsApp' : record.send_method}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {new Date(record.created_at).toLocaleString('en-MY')}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  by {record.sent_by.name}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                {(record.send_method === 'email' || record.send_method === 'both') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {record.email_status === 'sent' && (
                      <>
                        <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
                        <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>Email Sent</span>
                      </>
                    )}
                    {record.email_status === 'failed' && (
                      <>
                        <XCircle style={{ width: '16px', height: '16px', color: '#ef4444' }} />
                        <span
                          style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 600 }}
                          title={record.email_error_message}
                        >
                          Email Failed
                        </span>
                      </>
                    )}
                    {record.email_status === 'pending' && (
                      <>
                        <Clock style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
                        <span style={{ fontSize: '0.875rem', color: '#f59e0b', fontWeight: 600 }}>Pending</span>
                      </>
                    )}
                  </div>
                )}

                {record.whatsapp_link && (
                  <WhatsAppLinkButton link={record.whatsapp_link} label="Open WhatsApp" />
                )}
              </div>
            </div>

            {record.email_error_message && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <p style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                  Error: {record.email_error_message}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
