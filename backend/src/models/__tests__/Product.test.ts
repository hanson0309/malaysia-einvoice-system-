import mongoose from 'mongoose';
import { Product } from '../Product';

describe('Product Model - POS Extensions', () => {
  it('should create a product with POS fields', async () => {
    const productData = {
      tenant_id: new mongoose.Types.ObjectId(),
      name: 'Test Product',
      unit_price: 100,
      tax_type: 'SST' as const,
      tax_rate: 6,
      barcode: '1234567890123',
      stock_quantity: 50,
      reorder_level: 10,
      batch_number: 'BATCH-001',
      expiry_date: new Date('2027-12-31'),
      cost_price: 80,
    };

    const product = await Product.create(productData);
    expect(product.barcode).toBe('1234567890123');
    expect(product.stock_quantity).toBe(50);
    expect(product.cost_price).toBe(80);
  });
});
