import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { invoiceApi, customerApi, productApi } from '../lib/api';

interface LineItem {
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customer: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { product: '', description: '', quantity: 1, unitPrice: 0, taxRate: 6, amount: 0 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        customerApi.getAll(),
        productApi.getAll(),
      ]);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (product) {
      const newItems = [...lineItems];
      newItems[index] = {
        ...newItems[index],
        product: productId,
        description: product.name,
        unitPrice: product.price,
        taxRate: product.taxRate,
        amount: product.price * newItems[index].quantity,
      };
      setLineItems(newItems);
    }
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }

    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { product: '', description: '', quantity: 1, unitPrice: 0, taxRate: 6, amount: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = lineItems.reduce((sum, item) => sum + (item.amount * item.taxRate / 100), 0);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { subtotal, tax, total } = calculateTotals();

      await invoiceApi.create({
        ...formData,
        items: lineItems,
        subtotal,
        taxAmount: tax,
        totalAmount: total,
      });

      navigate('/dashboard/invoices');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer *
              </label>
              <select
                required
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 relative">
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Product</label>
                      <select
                        value={item.product}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700">Tax %</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.taxRate}
                        onChange={(e) => handleLineItemChange(index, 'taxRate', parseFloat(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700">Amount</label>
                      <input
                        type="text"
                        value={`RM ${item.amount.toFixed(2)}`}
                        disabled
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">RM {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">RM {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>RM {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/invoices')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
