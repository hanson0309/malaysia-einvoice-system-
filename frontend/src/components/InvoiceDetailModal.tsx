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
  void onClose;
  void handleSubmit;
  void handleRefreshStatus;
  void isRefreshing;
  void motion;
  void ArrowLeft;
  void Send;
  void RefreshCw;
  void X;
  void Clock;

  if (isLoading || !invoice) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-slate-300">Loading invoice...</div>
      </div>
    );
  }

  return null; // Placeholder for main UI
}
