import { Copy, ExternalLink, QrCode, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export interface InvoiceDocumentData {
  _id: string;
  invoice_number: string;
  status: string;
  source?: string;
  lhdn_submission_uid?: string;
  lhdn_submitted_at?: string;
  lhdn_validation_code?: string;
  lhdn_qr_code?: string;
  claim_submitted?: boolean;
  claim_status?: string;
  claim_url?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postcode?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    line_total: number;
  }>;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  issue_date: string;
  due_date?: string;
}

interface InvoiceDocumentViewProps {
  invoice: InvoiceDocumentData;
  isRefreshing?: boolean;
  onRefreshStatus?: () => void;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'accepted':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'submitted':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'draft':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function qrImageUrl(data: string, size = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function InvoiceDocumentView({
  invoice,
  isRefreshing = false,
  onRefreshStatus,
}: InvoiceDocumentViewProps) {
  const showClaimQr =
    invoice.source === 'pos' &&
    !invoice.claim_submitted &&
    invoice.status !== 'accepted' &&
    !!invoice.claim_url;

  const copyClaimUrl = async () => {
    if (!invoice.claim_url) return;
    try {
      await navigator.clipboard.writeText(invoice.claim_url);
      toast.success('Claim link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Tax Invoice
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Invoice</h1>
          <p className="text-base text-indigo-600 font-semibold mt-1">#{invoice.invoice_number}</p>
          {invoice.source === 'pos' && (
            <span className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-violet-100 text-violet-700">
              POS Receipt
            </span>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusBadgeClass(invoice.status)}`}
        >
          {invoice.status}
        </span>
      </div>

      {/* Bill to + dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Bill To
          </h3>
          <p className="text-sm font-semibold text-slate-900">
            {invoice.customer?.name || 'General Public (awaiting claim)'}
          </p>
          {invoice.customer?.email && (
            <p className="text-xs text-slate-600 mt-1">{invoice.customer.email}</p>
          )}
          {invoice.customer?.phone && (
            <p className="text-xs text-slate-600">{invoice.customer.phone}</p>
          )}
          {invoice.customer?.address_line1 && (
            <p className="text-xs text-slate-600 mt-1">
              {[
                invoice.customer.address_line1,
                invoice.customer.address_line2,
                invoice.customer.city,
                invoice.customer.postcode,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
        <div className="sm:text-right space-y-1">
          <div>
            <span className="text-xs text-slate-500">Issue Date </span>
            <span className="text-xs font-medium text-slate-900">
              {new Date(invoice.issue_date).toLocaleDateString('en-MY', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          </div>
          {invoice.due_date && (
            <div>
              <span className="text-xs text-slate-500">Due Date </span>
              <span className="text-xs font-medium text-slate-900">
                {new Date(invoice.due_date).toLocaleDateString('en-MY', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-3 font-semibold text-slate-500 uppercase tracking-wider w-[38%]">
                Description
              </th>
              <th className="text-center py-3 px-2 font-semibold text-slate-500 uppercase tracking-wider w-[10%]">
                Qty
              </th>
              <th className="text-right py-3 px-2 font-semibold text-slate-500 uppercase tracking-wider w-[18%]">
                Unit Price
              </th>
              <th className="text-center py-3 px-2 font-semibold text-slate-500 uppercase tracking-wider w-[10%]">
                Tax
              </th>
              <th className="text-right py-3 px-3 font-semibold text-slate-500 uppercase tracking-wider w-[18%]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className="border-b border-slate-100 align-top">
                <td className="py-3 px-3 text-slate-800 break-words">{item.description}</td>
                <td className="py-3 px-2 text-slate-700 text-center">{item.quantity}</td>
                <td className="py-3 px-2 text-slate-700 text-right whitespace-nowrap">
                  RM {item.unit_price.toFixed(2)}
                </td>
                <td className="py-3 px-2 text-slate-700 text-center whitespace-nowrap">
                  {item.tax_rate}%
                </td>
                <td className="py-3 px-3 text-slate-800 text-right whitespace-nowrap">
                  RM {item.line_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="text-slate-900">RM {invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax</span>
            <span className="text-slate-900">RM {invoice.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-slate-900">
            <span className="text-base font-bold text-slate-900">Total</span>
            <span className="text-lg font-bold text-slate-900">
              RM {invoice.total_amount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* E-Invoice claim QR (POS, not yet claimed) */}
      {showClaimQr && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="shrink-0 rounded-lg border border-white bg-white p-3 shadow-sm">
              <img
                src={qrImageUrl(invoice.claim_url!, 168)}
                alt="E-Invoice claim QR"
                className="w-[168px] h-[168px]"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">E-Invoice Claim</h2>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Customer has not claimed this receipt yet. They can scan this QR or open the link
                to submit their details for LHDN MyInvois.
              </p>
              <p className="text-[11px] font-mono text-slate-500 break-all bg-white/80 rounded-lg px-3 py-2 border border-indigo-100 mb-3">
                {invoice.claim_url}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={invoice.claim_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open claim page
                </a>
                <button
                  type="button"
                  onClick={copyClaimUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IRB MyInvois (after submission) */}
      {invoice.lhdn_submission_uid && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">IRB MyInvois Information</h2>
            {invoice.status === 'submitted' && onRefreshStatus && (
              <button
                type="button"
                onClick={onRefreshStatus}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">UUID</p>
              <p className="font-mono text-slate-900 break-all text-[11px]">
                {invoice.lhdn_submission_uid}
              </p>
            </div>
            {invoice.lhdn_submitted_at && (
              <div className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Submitted At
                </p>
                <p className="text-slate-900">
                  {new Date(invoice.lhdn_submitted_at).toLocaleString('en-MY', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
            {invoice.lhdn_validation_code && (
              <div className="bg-white rounded-lg p-3 border border-slate-100 sm:col-span-2">
                <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Validation Code
                </p>
                <p className="font-mono text-slate-900 break-all text-[11px]">
                  {invoice.lhdn_validation_code}
                </p>
              </div>
            )}
            {invoice.lhdn_qr_code && (
              <div className="sm:col-span-2 flex flex-col items-center pt-2">
                <p className="font-semibold text-slate-500 uppercase tracking-wider mb-2 self-start">
                  LHDN Validation QR
                </p>
                <img
                  src={invoice.lhdn_qr_code}
                  alt="LHDN validation QR"
                  className="w-32 h-32 border border-slate-200 rounded-lg bg-white p-2"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
