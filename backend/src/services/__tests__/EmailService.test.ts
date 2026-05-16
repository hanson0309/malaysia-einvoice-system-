// backend/src/services/__tests__/EmailService.test.ts
import { EmailService } from '../EmailService';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendInvoice', () => {
    it('should send email with PDF attachment', async () => {
      const emailService = new EmailService();
      const mockPdfBuffer = Buffer.from('fake-pdf-content');

      const result = await emailService.sendInvoice({
        to: 'customer@example.com',
        invoice: {
          invoice_number: 'INV-001',
          issue_date: new Date('2026-05-17'),
          due_date: new Date('2026-06-17'),
          total_amount: 1000.50,
        },
        customer: { name: 'Test Customer' },
        tenant: {
          company_name: 'Test Company',
          email: 'company@example.com',
          phone: '011-1111-1111',
        },
        pdfBuffer: mockPdfBuffer,
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: expect.stringContaining('INV-001'),
          html: expect.stringContaining('Test Customer'),
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'Invoice-INV-001.pdf',
              content: mockPdfBuffer,
            }),
          ]),
        })
      );
    });

    it('should handle invalid email address', async () => {
      const emailService = new EmailService();

      await expect(emailService.sendInvoice({
        to: 'invalid-email',
        invoice: {} as any,
        customer: {} as any,
        tenant: {} as any,
        pdfBuffer: Buffer.from(''),
      })).rejects.toThrow('Invalid email address');
    });
  });
});
