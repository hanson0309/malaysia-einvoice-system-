import { useState } from 'react';
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
    email: string;
    phone?: string;
  };
  onSuccess: () => void;
}

export default function SendInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: SendInvoiceModalProps) {
  // State management
  const [sendMethod, _setSendMethod] = useState<'email' | 'whatsapp' | 'both'>('email');
  const [_isSending, setIsSending] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [_whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [emailSubject, _setEmailSubject] = useState('');
  const [emailMessage, _setEmailMessage] = useState('');
  const [whatsappMessage, _setWhatsappMessage] = useState('');

  // Handle send function
  // @ts-expect-error - Function will be used in Part 2
  const _handleSend = async () => {
    setError(null);
    setIsSending(true);

    try {
      const data: SendInvoiceData = {
        send_method: sendMethod,
      };

      // Add optional fields based on send method
      if (sendMethod === 'email' || sendMethod === 'both') {
        if (emailSubject) data.email_subject = emailSubject;
        if (emailMessage) data.email_message = emailMessage;
      }

      if (sendMethod === 'whatsapp' || sendMethod === 'both') {
        if (whatsappMessage) data.whatsapp_message = whatsappMessage;
      }

      const response = await invoiceApi.send(invoice._id, data);

      // Handle WhatsApp link if present
      if (response.data.data.whatsapp_link) {
        setWhatsappLink(response.data.data.whatsapp_link);
      }

      // If email was sent successfully, show alert and close
      if (response.data.data.email_sent) {
        alert('Invoice sent successfully via email!');
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
