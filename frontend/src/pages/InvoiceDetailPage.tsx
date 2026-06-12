import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Download, FileText, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoiceApi, irbApi } from '../lib/api';
import SendInvoiceModal from '../components/SendInvoiceModal';
import InvoiceDocumentView, { type InvoiceDocumentData } from '../components/InvoiceDocumentView';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const response = await invoiceApi.getById(id!);
      setInvoice(response.data);
    } catch (error) {
      console.error('Failed to load invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('Submit this invoice to MyInvois IRB?')) return;
    try {
      await irbApi.submitInvoice(id!);
      toast.success('Submitted to IRB');
      loadInvoice();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Submission failed');
    }
  };

  const handleRefreshStatus = async () => {
    if (!invoice?.lhdn_submission_uid) return;
    setIsRefreshing(true);
    try {
      await irbApi.getStatus(id!);
      await loadInvoice();
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
    window.open(`${apiUrl}/invoices/${id}/pdf?token=${token}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500">
        Loading invoice…
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-slate-500">Invoice not found</p>
        <button
          onClick={() => navigate('/dashboard/invoices')}
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          Back to invoices
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          onClick={() => navigate('/dashboard/invoices')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={openPdf} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg">
            <FileText className="w-3.5 h-3.5" /> Preview PDF
          </button>
          <button onClick={openPdf} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
          <button
            onClick={() => setIsSendModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg"
          >
            <Mail className="w-3.5 h-3.5" /> Send to Customer
          </button>
          {invoice.status === 'draft' && !invoice.lhdn_submission_uid && invoice.source !== 'pos' && (
            <button
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg"
            >
              <Send className="w-3.5 h-3.5" /> Submit to IRB
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <InvoiceDocumentView
          invoice={invoice}
          isRefreshing={isRefreshing}
          onRefreshStatus={handleRefreshStatus}
        />
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
          }}
          invoiceId={invoice._id}
        />
      )}
    </div>
  );
}
