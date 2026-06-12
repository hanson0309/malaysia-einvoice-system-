import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const publicApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

type ReceiptData = {
  receipt_number: string;
  issue_date: string;
  status: string;
  lhdn_qr_code?: string;
  store: {
    name: string;
    phone: string;
    address: string;
    tin?: string;
    sst?: string;
    brn?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  subtotal: number;
  tax_amount: number;
  service_tax: number;
  total_amount: number;
  payment_method?: string;
  claim_submitted?: boolean;
};

type Step = 'receipt' | 'form' | 'done';

export default function ReceiptClaimPage() {
  const { receiptNo } = useParams<{ receiptNo: string }>();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant') ?? undefined;

  const [step, setStep] = useState<Step>('receipt');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [claimantType, setClaimantType] = useState<'individual' | 'business'>('individual');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    ic: '',
    tin: '',
    brn: '',
    sst: '',
    address_line1: '',
    address_line2: '',
    postcode: '',
    city: '',
    state_code: '',
    country_code: 'MY',
  });

  const receiptQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenant', tenantId);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [tenantId]);

  useEffect(() => {
    if (!receiptNo) return;
    (async () => {
      try {
        setLoading(true);
        const { data } = await publicApi.get<ReceiptData>(
          `/public/receipts/${encodeURIComponent(receiptNo)}${receiptQuery}`
        );
        setReceipt(data);
        if (data.claim_submitted) setStep('done');
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Receipt not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [receiptNo, receiptQuery]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!receiptNo) return;
    setSubmitting(true);
    try {
      await publicApi.post(
        `/public/receipts/${encodeURIComponent(receiptNo)}/claim${receiptQuery}`,
        {
          claimant_type: claimantType,
          name: form.name,
          email: form.email,
          phone: form.phone,
          ic: claimantType === 'individual' ? form.ic : undefined,
          tin: claimantType === 'business' ? form.tin : undefined,
          brn: claimantType === 'business' ? form.brn : undefined,
          sst: claimantType === 'business' ? form.sst : undefined,
          address_line1: form.address_line1,
          address_line2: form.address_line2 || undefined,
          postcode: form.postcode,
          city: form.city,
          state_code: form.state_code,
          country_code: form.country_code,
        }
      );
      toast.success('E-invoice claim submitted');
      setStep('done');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Loading receipt...
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Receipt not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <header className="text-center border-b border-slate-800 pb-4">
          <h1 className="text-xl font-bold">{receipt.store.name}</h1>
          <p className="text-sm text-slate-400 mt-1">{receipt.store.address}</p>
          <p className="text-sm text-slate-400">{receipt.store.phone}</p>
          {receipt.store.tin && (
            <p className="text-xs text-slate-500 mt-2">TIN: {receipt.store.tin}</p>
          )}
        </header>

        {step === 'receipt' && (
          <>
            <section className="rounded-xl border border-slate-800 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Receipt No</span>
                <span className="font-mono">{receipt.receipt_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Date</span>
                <span>{new Date(receipt.issue_date).toLocaleString()}</span>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left p-2">Item</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Unit</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 text-right">{item.unit_price.toFixed(2)}</td>
                      <td className="p-2 text-right">{item.line_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-xl border border-slate-800 p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>RM {receipt.subtotal.toFixed(2)}</span>
              </div>
              {receipt.service_tax > 0 && (
                <div className="flex justify-between">
                  <span>Service Tax</span>
                  <span>RM {receipt.service_tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax (SST)</span>
                <span>RM {receipt.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-700">
                <span>Total</span>
                <span>RM {receipt.total_amount.toFixed(2)}</span>
              </div>
            </section>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold"
            >
              Request E-Invoice
            </button>
          </>
        )}

        {step === 'form' && (
          <section className="rounded-xl border border-slate-800 p-4 space-y-4">
            <h2 className="font-semibold">Your details</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setClaimantType('individual')}
                className={`flex-1 py-2 rounded-lg border ${
                  claimantType === 'individual'
                    ? 'border-violet-500 bg-violet-500/20'
                    : 'border-slate-700'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setClaimantType('business')}
                className={`flex-1 py-2 rounded-lg border ${
                  claimantType === 'business'
                    ? 'border-violet-500 bg-violet-500/20'
                    : 'border-slate-700'
                }`}
              >
                Business
              </button>
            </div>
            <input
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
              placeholder="Full name / Company name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
            {claimantType === 'individual' ? (
              <input
                className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
                placeholder="IC / NRIC"
                value={form.ic}
                onChange={(e) => update('ic', e.target.value)}
              />
            ) : (
              <>
                <input
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
                  placeholder="TIN"
                  value={form.tin}
                  onChange={(e) => update('tin', e.target.value)}
                />
                <input
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
                  placeholder="BRN (optional)"
                  value={form.brn}
                  onChange={(e) => update('brn', e.target.value)}
                />
              </>
            )}
            <input
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
              placeholder="Email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
            <input
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
              placeholder="Mobile"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
            <input
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
              placeholder="Address line 1"
              value={form.address_line1}
              onChange={(e) => update('address_line1', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-lg bg-slate-900 border border-slate-700 p-2"
                placeholder="Postcode"
                value={form.postcode}
                onChange={(e) => update('postcode', e.target.value)}
              />
              <input
                className="rounded-lg bg-slate-900 border border-slate-700 p-2"
                placeholder="City"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
              />
            </div>
            <input
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
              placeholder="State code (e.g. 10)"
              value={form.state_code}
              onChange={(e) => update('state_code', e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('receipt')}
                className="flex-1 py-2 rounded-lg border border-slate-700"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit claim'}
              </button>
            </div>
          </section>
        )}

        {step === 'done' && (
          <section className="rounded-xl border border-slate-800 p-6 text-center space-y-3">
            <p className="text-lg font-semibold text-emerald-400">Claim received</p>
            <p className="text-sm text-slate-400">
              Your e-invoice request for receipt {receipt.receipt_number} has been recorded.
            </p>
            {receipt.lhdn_qr_code && (
              <img
                src={receipt.lhdn_qr_code}
                alt="LHDN QR"
                className="mx-auto w-40 h-40"
              />
            )}
          </section>
        )}
      </div>
    </div>
  );
}
