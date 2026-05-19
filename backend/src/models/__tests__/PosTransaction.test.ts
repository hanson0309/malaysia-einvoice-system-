import mongoose from 'mongoose';
import { PosTransaction } from '../PosTransaction';

describe('PosTransaction Model', () => {
  it('should create a transaction with valid data', async () => {
    const transactionData = {
      transaction_id: 'txn-uuid-123',
      tenant_id: new mongoose.Types.ObjectId(),
      transaction_number: 'TXN-001',
      transaction_date: new Date(),
      cashier_id: new mongoose.Types.ObjectId(),
      items: [
        {
          product_id: new mongoose.Types.ObjectId(),
          description: 'Test Product',
          quantity: 2,
          unit_price: 10.0,
          tax_type: 'SST' as const,
          tax_rate: 6,
          tax_amount: 1.2,
          line_total: 21.2,
        },
      ],
      subtotal: 20.0,
      tax_amount: 1.2,
      total_amount: 21.2,
      payment_method: 'cash' as const,
      payment_status: 'paid' as const,
      device_id: 'device-uuid',
    };

    const transaction = await PosTransaction.create(transactionData);
    expect(transaction.transaction_number).toBe('TXN-001');
    expect(transaction.items).toHaveLength(1);
    expect(transaction.total_amount).toBe(21.2);
  });
});
