import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Send, RefreshCw, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { invoiceApi, irbApi } from '../lib/api';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  registrationNumber?: string;
  address_line1?: string;
}

interface LineItem {
  product: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  line_total: number;
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
    if (!confirm('确认提交此发票到 MyInvois IRB？\n提交后将无法撤销。')) return;

    try {
      const response = await irbApi.submitInvoice(invoiceId);

      // 显示详细结果
      if (response.data.status === 'Valid') {
        alert(`✅ 发票已成功提交并验证！\n\nUUID: ${response.data.uuid}\nSignature: ${response.data.longId}\n\n状态已更新为 "accepted"`);
      } else if (response.data.status === 'Invalid') {
        alert(`⚠️ 发票已提交但验证失败\n\nUUID: ${response.data.uuid}\n状态: ${response.data.status}`);
      } else {
        alert(`发票已提交到 IRB\n\nUUID: ${response.data.uuid}\n状态: ${response.data.status || 'pending'}`);
      }

      await loadInvoice();
      onUpdate();

      // 如果成功，2秒后自动关闭 Modal
      if (response.data.status === 'Valid') {
        setTimeout(() => {
          onClose();
        }, 2000);
      }
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
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-xs">Back to Invoices</span>
            </button>

            {invoice.status === 'draft' && !invoice.lhdn_submission_uid && (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
              >
                <Send className="w-3 h-3" />
                Submit to IRB
              </button>
            )}
          </div>

          {/* Scrollable Content Area */}
          <div className="overflow-y-auto px-6 py-6" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
            {/* Invoice Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">Invoice</h1>
                <p className="text-base text-indigo-600 font-medium">#{invoice.invoice_number}</p>
              </div>
              <div className="px-2.5 py-1 bg-slate-100 rounded">
                <span className="text-xs text-slate-600 font-medium">{invoice.status}</span>
              </div>
            </div>

            {/* Bill To and Dates */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bill To:</h3>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900">{invoice.customer?.name || 'N/A'}</p>
                  {invoice.customer?.email && (
                    <p className="text-xs text-slate-600">{invoice.customer.email}</p>
                  )}
                  {invoice.customer?.phone && (
                    <p className="text-xs text-slate-600">{invoice.customer.phone}</p>
                  )}
                  {invoice.customer?.address_line1 && (
                    <p className="text-xs text-slate-600">{invoice.customer.address_line1}</p>
                  )}
                </div>
              </div>

              <div className="text-right space-y-1.5">
                <div>
                  <span className="text-xs text-slate-500">Issue Date: </span>
                  <span className="text-xs text-slate-900 font-medium">
                    {new Date(invoice.issue_date).toLocaleDateString('en-MY', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {invoice.due_date && (
                  <div>
                    <span className="text-xs text-slate-500">Due Date: </span>
                    <span className="text-xs text-slate-900 font-medium">
                      {new Date(invoice.due_date).toLocaleDateString('en-MY', {
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="text-center py-2 font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                    <th className="text-right py-2 font-bold text-slate-500 uppercase tracking-wider">Unit Price</th>
                    <th className="text-center py-2 font-bold text-slate-500 uppercase tracking-wider">Tax</th>
                    <th className="text-right py-2 font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: LineItem, index: number) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-2.5 text-slate-900">{item.description}</td>
                      <td className="py-2.5 text-slate-700 text-center">{item.quantity}</td>
                      <td className="py-2.5 text-slate-700 text-right">RM {item.unit_price.toFixed(2)}</td>
                      <td className="py-2.5 text-slate-700 text-center">{item.tax_rate}%</td>
                      <td className="py-2.5 text-slate-900 text-right font-semibold">RM {item.line_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="text-slate-900">RM {invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Tax:</span>
                  <span className="text-slate-900">RM {invoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t-2 border-slate-900">
                  <span className="text-base font-bold text-slate-900">Total:</span>
                  <span className="text-lg font-bold text-slate-900">RM {invoice.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* IRB Information */}
            {invoice.lhdn_submission_uid && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-900">IRB MyInvois Information</h2>
                  {invoice.status === 'submitted' && (
                    <button
                      onClick={handleRefreshStatus}
                      disabled={isRefreshing}
                      className="flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-4 text-xs">
                  <div>
                    <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">UUID</p>
                    <p className="font-mono text-slate-900 break-all">{invoice.lhdn_submission_uid}</p>
                  </div>

                  {invoice.lhdn_submitted_at && (
                    <div>
                      <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Submitted At</p>
                      <p className="text-slate-900">
                        {new Date(invoice.lhdn_submitted_at).toLocaleString('en-MY', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  {invoice.lhdn_validation_code && (
                    <div>
                      <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Validation Code</p>
                      <p className="font-mono text-slate-900">{invoice.lhdn_validation_code}</p>
                    </div>
                  )}

                  {invoice.lhdn_qr_code && (
                    <div className="col-span-2 pt-3 border-t border-slate-200">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider mb-2">QR Code</p>
                      <img
                        src={invoice.lhdn_qr_code}
                        alt="IRB QR Code"
                        className="w-24 h-24 border border-slate-300 rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
