import { useState, useEffect } from 'react';
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

  // Return null if modal is not open
  if (!isOpen) {
    return null;
  }

  return null; // Placeholder - JSX will be added in Part 2
}
