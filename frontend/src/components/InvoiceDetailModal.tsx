import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Send, X, Download, FileText, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { invoiceApi, irbApi } from '../lib/api';
import SendInvoiceModal from './SendInvoiceModal';
import InvoiceDocumentView, { type InvoiceDocumentData } from './InvoiceDocumentView';

interface InvoiceDetailModalProps {
  invoiceId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function InvoiceDetailModal({ invoiceId, onClose, onUpdate }: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<InvoiceDocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const loadInvoice = useCallback(async () => {
    try {
      const response = await invoiceApi.getById(invoiceId);
      setInvoice(response.data);
    } catch (error) {
      console.error('Failed to load invoice:', error);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleSubmit = async () => {
    if (!confirm('Submit this invoice to MyInvois IRB?\nThis cannot be undone.')) return;

    try {
      const response = await irbApi.submitInvoice(invoiceId);

      if (response.data.status === 'Valid') {
        toast.success('Invoice submitted and validated by IRB');
      } else if (response.data.status === 'Invalid') {
        toast.error('Invoice submitted but LHDN validation failed');
      } else {
        toast.success('Invoice submitted to IRB');
      }

      await loadInvoice();
      onUpdate();

      if (response.data.status === 'Valid') {
        setTimeout(onClose, 2000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Submission failed';
      toast.error(errorMsg.includes('credentials') ? 'IRB credentials not configured' : errorMsg);
    }
  };

  const handleRefreshStatus = async () => {
    if (!invoice?.lhdn_submission_uid) return;

    setIsRefreshing(true);
    try {
      await irbApi.getStatus(invoiceId);
      await loadInvoice();
      onUpdate();
      toast.success('Status refreshed');
    } catch {
      toast.error('Could not refresh status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const openPdf = () => {
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    window.open(`${apiUrl}/invoices/${invoiceId}/pdf?token=${token}`, '_blank');
  };

  if (isLoading || !invoice) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-slate-300">Loading invoice…</div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      <button
        onClick={onClose}
        className="fixed top-6 left-6 w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white transition-colors z-[60]"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col"
          style={{ maxHeight: 'calc(100vh - 3rem)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Invoices
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Preview PDF
              </button>
              <button
                onClick={openPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
              <button
                onClick={() => setIsSendModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Send to Customer
              </button>
              {invoice.status === 'draft' && !invoice.lhdn_submission_uid && invoice.source !== 'pos' && (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit to IRB
                </button>
              )}
            </div>
          </div>

          {/* Document */}
          <div className="overflow-y-auto px-5 sm:px-8 py-6 flex-1">
            <InvoiceDocumentView
              invoice={invoice}
              isRefreshing={isRefreshing}
              onRefreshStatus={handleRefreshStatus}
            />
          </div>
        </motion.div>
      </div>

      {invoice.customer && (
        <SendInvoiceModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          invoice={{
            _id: invoice._id,
            invoice_number: invoice.invoice_number,
            total_amount: invoice.total_amount,
          }}
          customer={{
            name: invoice.customer.name || '',
            email: invoice.customer.email || '',
            phone: invoice.customer.phone,
          }}
          onSuccess={() => {
            setIsSendModalOpen(false);
            loadInvoice();
            onUpdate();
          }}
          invoiceId={invoice._id}
        />
      )}
    </>
  );
}
