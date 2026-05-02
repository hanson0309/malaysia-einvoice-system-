import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, RefreshCw } from 'lucide-react';
import { invoiceApi, irbApi } from '../lib/api';

interface InvoiceData {
  _id: string;
  invoice_number: string;
  status: string;
  lhdn_submission_uid?: string;
  lhdn_submitted_at?: string;
  lhdn_validation_code?: string;
  lhdn_qr_code?: string;
  lhdn_digital_signature?: string;
  customer: any;
  items: any[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  issue_date: string;
  due_date?: string;
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    if (!confirm('确认提交此发票到 MyInvois IRB？\n提交后将无法撤销。')) return;

    try {
      await irbApi.submitInvoice(id!);
      alert('发票已成功提交到 IRB！');
      loadInvoice();
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
      const response = await irbApi.getStatus(id!);
      const newStatus = response.data.status;
      const currentStatus = invoice.status;

      if (newStatus !== currentStatus) {
        alert(`状态已更新为：${newStatus}`);
      } else {
        alert(`状态无变化，仍为：${currentStatus}`);
      }

      await loadInvoice();
    } catch (error: any) {
      alert('无法获取最新状态，请稍后重试');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getIRBStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard/invoices')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Invoices
        </button>

        {invoice.status === 'draft' && !invoice.lhdn_submission_uid && (
          <button
            onClick={handleSubmit}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit to IRB
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-8">
        <div className="border-b pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice</h1>
              <p className="text-lg text-gray-600 mt-1">#{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <div className="space-y-2">
                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                  invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* IRB Information Section */}
        {invoice.lhdn_submission_uid && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">IRB MyInvois Information</h2>
              {invoice.status === 'submitted' && (
                <button
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? '刷新中...' : '刷新状态'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full border ${getIRBStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">UUID</p>
                <p className="text-sm font-mono text-gray-900 break-all">{invoice.lhdn_submission_uid}</p>
              </div>

              {invoice.lhdn_submitted_at && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Submitted At</p>
                  <p className="text-sm text-gray-900">
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
                  <p className="text-sm text-gray-600 mb-1">Validation Code</p>
                  <p className="text-sm font-mono text-gray-900">{invoice.lhdn_validation_code}</p>
                </div>
              )}
            </div>

            {invoice.lhdn_qr_code && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-gray-600 mb-2">QR Code</p>
                <img
                  src={invoice.lhdn_qr_code}
                  alt="IRB QR Code"
                  className="w-32 h-32 border border-gray-300 rounded"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Bill To:</h3>
            <div className="text-gray-900">
              <p className="font-medium">{invoice.customer?.name || 'Customer information not available'}</p>
              {invoice.customer?.email && <p className="text-sm">{invoice.customer.email}</p>}
              {invoice.customer?.phone && <p className="text-sm">{invoice.customer.phone}</p>}
              {invoice.customer?.address_line1 && <p className="text-sm mt-1">{invoice.customer.address_line1}</p>}
            </div>
          </div>

          <div className="text-right">
            <div className="space-y-1">
              <p className="text-sm">
                <span className="text-gray-500">Issue Date:</span>{' '}
                <span className="text-gray-900">{new Date(invoice.issue_date).toLocaleDateString()}</span>
              </p>
              {invoice.due_date && (
                <p className="text-sm">
                  <span className="text-gray-500">Due Date:</span>{' '}
                  <span className="text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-4 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">RM {item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">{item.tax_rate}%</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">RM {item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">RM {invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">RM {invoice.tax_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>RM {invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
