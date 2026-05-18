import mongoose from 'mongoose';
import { InvoiceSending, IInvoiceSending } from '../InvoiceSending';

describe('InvoiceSending Model', () => {
  it('should have correct schema structure', () => {
    const schema = InvoiceSending.schema;

    // Check required fields
    expect(schema.path('tenant_id').isRequired).toBe(true);
    expect(schema.path('invoice_id').isRequired).toBe(true);
    expect(schema.path('customer_id').isRequired).toBe(true);
    expect(schema.path('send_method').isRequired).toBe(true);
    expect(schema.path('email_sent').isRequired).toBe(true);
    expect(schema.path('email_status').isRequired).toBe(true);
    expect(schema.path('email_to').isRequired).toBe(true);
    expect(schema.path('whatsapp_link_generated').isRequired).toBe(true);
    expect(schema.path('sent_by').isRequired).toBe(true);

    // Check enums
    expect(schema.path('send_method').enumValues).toEqual(['email', 'whatsapp', 'both']);
    expect(schema.path('email_status').enumValues).toEqual(['pending', 'sent', 'failed']);

    // Check defaults
    expect(schema.path('email_sent').defaultValue).toBe(false);
    expect(schema.path('email_status').defaultValue).toBe('pending');
    expect(schema.path('whatsapp_link_generated').defaultValue).toBe(false);

    // Check whatsapp_phone is required
    expect(schema.path('whatsapp_phone').isRequired).toBe(true);
  });

  it('should have correct indexes', () => {
    const indexes = InvoiceSending.schema.indexes();

    // Check that we have the expected indexes
    expect(indexes.length).toBeGreaterThanOrEqual(3);

    // Check for tenant_id + invoice_id index
    const tenantInvoiceIndex = indexes.find((idx: any) =>
      idx[0].tenant_id === 1 && idx[0].invoice_id === 1
    );
    expect(tenantInvoiceIndex).toBeDefined();

    // Check for tenant_id + customer_id index
    const tenantCustomerIndex = indexes.find((idx: any) =>
      idx[0].tenant_id === 1 && idx[0].customer_id === 1
    );
    expect(tenantCustomerIndex).toBeDefined();

    // Check for tenant_id + created_at index
    const tenantCreatedIndex = indexes.find((idx: any) =>
      idx[0].tenant_id === 1 && idx[0].created_at === -1
    );
    expect(tenantCreatedIndex).toBeDefined();
  });

  it('should have timestamps enabled', () => {
    const schema = InvoiceSending.schema;
    expect(schema.path('created_at')).toBeDefined();
    expect(schema.path('updated_at')).toBeDefined();
  });
});
