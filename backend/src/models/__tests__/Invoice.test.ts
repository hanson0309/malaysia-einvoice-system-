import mongoose from 'mongoose';
import { Invoice } from '../Invoice';

describe('Invoice Model - POS Source Tracking', () => {
  it('should create an invoice with POS source', async () => {
    const invoiceData = {
      tenant_id: new mongoose.Types.ObjectId(),
      invoice_number: 'INV-POS-001',
      invoice_type: '02' as const,
      customer_id: new mongoose.Types.ObjectId(),
      issue_date: new Date(),
      currency: 'MYR',
      exchange_rate: 1.0,
      subtotal: 100,
      tax_amount: 6,
      total_amount: 106,
      status: 'draft' as const,
      retry_count: 0,
      items: [
        {
          description: 'Test Item',
          quantity: 1,
          unit_price: 100,
          tax_type: 'SST' as const,
          tax_rate: 6,
          tax_amount: 6,
          line_total: 106,
        },
      ],
      source: 'pos' as const,
      pos_transaction_id: 'txn-uuid-123',
    };

    const invoice = await Invoice.create(invoiceData);
    expect(invoice.source).toBe('pos');
    expect(invoice.pos_transaction_id).toBe('txn-uuid-123');
  });
});
