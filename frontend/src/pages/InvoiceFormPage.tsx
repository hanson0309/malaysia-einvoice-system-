import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, X, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { invoiceApi, customerApi, productApi } from '../lib/api';

interface LineItem {
  product: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  amount: number;
}

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_type: '01' as '01' | '02' | '03' | '04',
    customer_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    currency: 'MYR',
    exchange_rate: 1.0,
    payment_method: '' as 'cash' | 'bank_transfer' | 'card' | 'ewallet' | '',
    payment_terms: '',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { product: '', description: '', quantity: 1, unit_price: 0, tax_type: 'SST', tax_rate: 6, amount: 0 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    generateInvoiceNumber();
  }, []);

  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `INV-${year}${month}-${random}`;
    setFormData(prev => ({ ...prev, invoice_number: invoiceNumber }));
  };

  const loadData = async () => {
    try {
      console.log('Loading customers and products...');
      const [customersRes, productsRes] = await Promise.all([
        customerApi.getAll(),
        productApi.getAll(),
      ]);
      console.log('Customers response:', customersRes.data);
      console.log('Products response:', productsRes.data);

      // Handle nested data structure from backend
      const customersData = Array.isArray(customersRes.data)
        ? customersRes.data
        : customersRes.data?.data || [];
      const productsData = Array.isArray(productsRes.data)
        ? productsRes.data
        : productsRes.data?.data || [];

      console.log('Parsed customers:', customersData);
      console.log('Parsed products:', productsData);

      setCustomers(customersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setCustomers([]);
      setProducts([]);
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
        unit_price: product.price,
        amount: product.price * newItems[index].quantity,
      };
      setLineItems(newItems);
    }
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
    }

    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { product: '', description: '', quantity: 1, unit_price: 0, tax_type: 'SST', tax_rate: 6, amount: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = lineItems.reduce((sum, item) => sum + (item.amount * item.tax_rate / 100), 0);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { subtotal: _subtotal, tax: _tax, total: _total } = calculateTotals();

      // Map frontend data to backend API format
      const invoiceData = {
        invoice_number: formData.invoice_number,
        invoice_type: formData.invoice_type,
        customer_id: formData.customer_id,
        issue_date: formData.issue_date,
        due_date: formData.due_date || undefined,
        currency: formData.currency,
        exchange_rate: formData.exchange_rate,
        payment_method: formData.payment_method || undefined,
        payment_terms: formData.payment_terms || undefined,
        status: saveAsDraft ? 'draft' : 'pending',
        items: lineItems.map(item => ({
          product_id: item.product || undefined,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_type: item.tax_type,
          tax_rate: item.tax_rate,
        })),
      };

      console.log('Submitting invoice:', invoiceData);
      await invoiceApi.create(invoiceData);
      navigate('/dashboard/invoices');
    } catch (err: any) {
      console.error('Invoice creation error:', err.response?.data);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '0.75rem',
    color: '#f1f5f9',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#cbd5e1',
    marginBottom: '0.5rem',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '0.5rem',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%)',
              borderRadius: '0.75rem'
            }}>
              <FileText style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
            </div>
            <div>
              <h1 style={{
                fontSize: '2.25rem',
                fontWeight: 700,
                color: '#f1f5f9',
                marginBottom: '0.25rem'
              }}>
                Create Invoice
              </h1>
              <p style={{ fontSize: '1rem', color: '#94a3b8' }}>
                Fill in the details to create a new invoice
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => navigate('/dashboard/invoices')}
            style={{
              padding: '0.75rem',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '0.75rem',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            whileHover={{ scale: 1.05, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
            whileTap={{ scale: 0.95 }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </motion.button>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          background: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '1.5rem',
          padding: '2rem'
        }}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.75rem',
              color: '#f87171',
              fontSize: '0.875rem'
            }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Invoice Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label style={labelStyle}>Invoice Number *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  required
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="INV-2026-001"
                />
                <motion.button
                  type="button"
                  onClick={generateInvoiceNumber}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '0.75rem',
                    color: '#a78bfa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  whileHover={{ scale: 1.05, background: 'rgba(139, 92, 246, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  title="Generate new invoice number"
                >
                  <RefreshCw style={{ width: '18px', height: '18px' }} />
                </motion.button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Invoice Type *</label>
              <select
                required
                value={formData.invoice_type}
                onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value as any })}
                style={inputStyle}
              >
                <option value="01">01 - Invoice</option>
                <option value="02">02 - Credit Note</option>
                <option value="03">03 - Debit Note</option>
                <option value="04">04 - Refund Note</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Customer *</label>
              <select
                required
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                style={inputStyle}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} {customer.tin_number ? `(TIN: ${customer.tin_number})` : ''} {customer.email ? `- ${customer.email}` : ''}
                  </option>
                ))}
              </select>
              {formData.customer_id && (
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  padding: '0.5rem',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '0.5rem'
                }}>
                  {(() => {
                    const selectedCustomer = customers.find(c => c._id === formData.customer_id);
                    if (!selectedCustomer) return null;
                    return (
                      <>
                        <div><strong>Type:</strong> {selectedCustomer.customer_type}</div>
                        {selectedCustomer.phone && <div><strong>Phone:</strong> {selectedCustomer.phone}</div>}
                        {selectedCustomer.address_line1 && <div><strong>Address:</strong> {selectedCustomer.address_line1}</div>}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Issue Date *</label>
              <input
                type="date"
                required
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                style={inputStyle}
              >
                <option value="">Select payment method</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="ewallet">E-Wallet</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>
                Line Items
              </h3>
              <motion.button
                type="button"
                onClick={addLineItem}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '0.75rem',
                  color: '#a78bfa',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                whileHover={{ scale: 1.05, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                Add Item
              </motion.button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {lineItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{
                    position: 'relative',
                    padding: '1.5rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '1rem'
                  }}
                >
                  {lineItems.length > 1 && (
                    <motion.button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        padding: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '0.5rem',
                        color: '#f87171',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.2)' }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </motion.button>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 1fr', gap: '1rem', paddingRight: lineItems.length > 1 ? '3rem' : '0' }}>
                    <div>
                      <label style={labelStyle}>Product</label>
                      <select
                        value={item.product}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Description *</label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        style={inputStyle}
                        placeholder="Item description"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Tax Type *</label>
                      <select
                        required
                        value={item.tax_type}
                        onChange={(e) => handleLineItemChange(index, 'tax_type', e.target.value)}
                        style={inputStyle}
                      >
                        <option value="SST">SST</option>
                        <option value="E">Exempt</option>
                        <option value="Z">Zero Rated</option>
                        <option value="SR">Standard Rated</option>
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Tax %</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={item.tax_rate}
                        onChange={(e) => handleLineItemChange(index, 'tax_rate', parseFloat(e.target.value))}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Amount</label>
                      <div style={{
                        ...inputStyle,
                        background: 'rgba(15, 23, 42, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 600,
                        color: '#34d399'
                      }}>
                        RM {item.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              padding: '1.5rem',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '1rem',
              marginBottom: '2rem'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px', marginLeft: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: '#94a3b8' }}>Subtotal:</span>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>RM {subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: '#94a3b8' }}>Tax:</span>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>RM {tax.toFixed(2)}</span>
              </div>
              <div style={{
                height: '1px',
                background: 'rgba(139, 92, 246, 0.2)',
                margin: '0.5rem 0'
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem' }}>
                <span style={{ color: '#f1f5f9', fontWeight: 700 }}>Total:</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>RM {total.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <motion.button
              type="button"
              onClick={() => navigate('/dashboard/invoices')}
              style={{
                padding: '0.875rem 1.75rem',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '0.75rem',
                color: '#94a3b8',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              whileHover={{ scale: 1.05, background: 'rgba(30, 41, 59, 1)' }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isLoading}
              style={{
                padding: '0.875rem 1.75rem',
                background: isLoading ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '0.75rem',
                color: '#a78bfa',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
              whileHover={!isLoading ? { scale: 1.05, background: 'rgba(139, 92, 246, 0.3)' } : {}}
              whileTap={!isLoading ? { scale: 0.95 } : {}}
            >
              {isLoading ? 'Saving...' : 'Save as Draft'}
            </motion.button>
            <motion.button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '0.875rem 1.75rem',
                background: isLoading ? 'rgba(245, 158, 11, 0.5)' : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                border: 'none',
                borderRadius: '0.75rem',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
              whileHover={!isLoading ? { scale: 1.05, boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)' } : {}}
              whileTap={!isLoading ? { scale: 0.95 } : {}}
            >
              {isLoading ? 'Creating...' : 'Create Invoice'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
