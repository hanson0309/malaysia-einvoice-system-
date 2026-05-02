import { useEffect, useState } from 'react';
import { ArrowLeft, Send, RefreshCw, X, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { invoiceApi, irbApi } from '../lib/api';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  registrationNumber?: string;
}

interface LineItem {
  product: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  amount: number;
}

interface InvoiceData {
  _id: string;
  invoice_number: string;
  status: string;
  lhdn_submission_uid?: string;
  lhdn_submitted_at?: string;
  lhdn_validation_code?: string;
  lhdn_qr_code?: string;
  lhdn_digital_signature?: string;
  customer: Customer;
  items: LineItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  issue_date: string;
  due_date?: string;
}

interface InvoiceDetailModalProps {
  invoiceId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function InvoiceDetailModal({ invoiceId, onClose, onUpdate }: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const response = await invoiceApi.getById(invoiceId);
      setInvoice(response.data);
    } catch (error) {
      console.error('Failed to load invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('确认提交此发票到 MyInvois IRB？\n提交后将无法撤销。')) return;

    try {
      await irbApi.submitInvoice(invoiceId);
      alert('发票已成功提交到 IRB！');
      await loadInvoice();
      onUpdate();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || '提交失败';

      if (errorMsg.includes('credentials not configured')) {
        alert('IRB 凭证未配置，请联系系统管理员配置 MyInvois Client ID 和 Secret。');
      } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
        alert('网络连接失败，请稍后重试');
      } else {
        alert(`提交失败：${errorMsg}`);
      }
    }
  };

  const handleRefreshStatus = async () => {
    if (!invoice?.lhdn_submission_uid) return;

    setIsRefreshing(true);
    try {
      const response = await irbApi.getStatus(invoiceId);
      const newStatus = response.data.status;
      const currentStatus = invoice.status;

      if (newStatus !== currentStatus) {
        alert(`状态已更新为：${newStatus}`);
      } else {
        alert(`状态无变化，仍为：${currentStatus}`);
      }

      await loadInvoice();
      onUpdate();
    } catch (error: any) {
      alert('无法获取最新状态，请稍后重试');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Placeholder for hooks and handlers - suppress unused parameter warnings
  void handleSubmit;
  void handleRefreshStatus;
  void isRefreshing;
  void ArrowLeft;
  void Send;
  void RefreshCw;
  void Clock;

  if (isLoading || !invoice) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-slate-300">Loading invoice...</div>
      </div>
    );
  }

  return (
    <>
      {/* Background Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Close Button - Top Left */}
      <button
        onClick={onClose}
        className="fixed top-6 left-6 w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white transition-colors z-[60]"
      >
        <X className="w-6 h-6" />
      </button>

      {/* System Online Badge - Top Right */}
      <div className="fixed top-6 right-6 z-[60]">
        <div className="px-4 py-2 rounded-full border-2 border-emerald-500/50 bg-[#2d3748]/80">
          <span className="text-sm text-emerald-400 font-medium">System Online</span>
        </div>
      </div>

      {/* Modal Card Container */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
          style={{ maxHeight: 'calc(100vh - 8rem)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Placeholder for card content */}
          <div>Card content goes here</div>
        </motion.div>
      </div>
    </>
  );
}
