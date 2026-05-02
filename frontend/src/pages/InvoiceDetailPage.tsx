import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { invoiceApi } from '../lib/api';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!confirm('Submit this invoice to MyInvois?')) return;

    try {
      await invoiceApi.submit(id!);
      alert('Invoice submitted successfully!');
      loadInvoice();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit invoice');
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

        {invoice.status === 'draft' && !invoice.myInvoisStatus && (
          <button
            onClick={handleSubmit}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit to MyInvois
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-8">
        <div className="border-b pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice</h1>
              <p className="text-lg text-gray-600 mt-1">#{invoice.invoiceNumber}</p>
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
                {invoice.myInvoisStatus && (
                  <div>
                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                      invoice.myInvoisStatus === 'validated' ? 'bg-green-100 text-green-800' :
                      invoice.myInvoisStatus === 'submitted' ? 'bg-blue-100 text-blue-800' :
                      invoice.myInvoisStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      MyInvois: {invoice.myInvoisStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Bill To:</h3>
            <div className="text-gray-900">
              <p className="font-medium">{invoice.customer.name}</p>
              <p className="text-sm">{invoice.customer.email}</p>
              {invoice.customer.phone && <p className="text-sm">{invoice.customer.phone}</p>}
              {invoice.customer.address && <p className="text-sm mt-1">{invoice.customer.address}</p>}
            </div>
          </div>

          <div className="text-right">
            <div className="space-y-1">
              <p className="text-sm">
                <span className="text-gray-500">Issue Date:</span>{' '}
                <span className="text-gray-900">{new Date(invoice.issueDate).toLocaleDateString()}</span>
              </p>
              {invoice.dueDate && (
                <p className="text-sm">
                  <span className="text-gray-500">Due Date:</span>{' '}
                  <span className="text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</span>
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
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">RM {item.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">{item.taxRate}%</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">RM {item.amount.toFixed(2)}</td>
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
              <span className="font-medium">RM {invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>RM {invoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
