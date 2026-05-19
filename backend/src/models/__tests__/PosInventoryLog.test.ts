import mongoose from 'mongoose';
import { PosInventoryLog } from '../PosInventoryLog';

describe('PosInventoryLog Model', () => {
  it('should create an inventory log entry', async () => {
    const logData = {
      tenant_id: new mongoose.Types.ObjectId(),
      product_id: new mongoose.Types.ObjectId(),
      transaction_type: 'sale' as const,
      quantity_change: -5,
      before_quantity: 100,
      after_quantity: 95,
      reference_id: 'txn-123',
      created_by: new mongoose.Types.ObjectId(),
    };

    const log = await PosInventoryLog.create(logData);
    expect(log.transaction_type).toBe('sale');
    expect(log.quantity_change).toBe(-5);
  });
});
