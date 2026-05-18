// backend/src/services/__tests__/WhatsAppService.test.ts
import { WhatsAppService } from '../WhatsAppService';

describe('WhatsAppService', () => {
  describe('formatPhone', () => {
    it('should format Malaysian phone numbers correctly', () => {
      expect(WhatsAppService.formatPhone('012-345-6789')).toBe('60123456789');
      expect(WhatsAppService.formatPhone('0123456789')).toBe('60123456789');
      expect(WhatsAppService.formatPhone('+60123456789')).toBe('60123456789');
      expect(WhatsAppService.formatPhone('60123456789')).toBe('60123456789');
    });

    it('should handle invalid phone numbers', () => {
      expect(() => WhatsAppService.formatPhone('')).toThrow('Phone number is required');
      expect(() => WhatsAppService.formatPhone('abc')).toThrow('Invalid phone number format');
    });
  });

  describe('generateInvoiceLink', () => {
    it('should generate valid WhatsApp link', () => {
      const link = WhatsAppService.generateInvoiceLink({
        phone: '012-345-6789',
        invoice: {
          invoice_number: 'INV-001',
          issue_date: new Date('2026-05-17'),
          due_date: new Date('2026-06-17'),
          total_amount: 1000.50,
        },
        customer: { name: 'Test Customer' },
        tenant: { company_name: 'Test Company', phone: '011-1111-1111' },
      });

      expect(link).toMatch(/^https:\/\/wa\.me\/60123456789\?text=/);
      expect(decodeURIComponent(link)).toContain('INV-001');
      expect(decodeURIComponent(link)).toContain('RM 1000.50');
    });
  });
});
