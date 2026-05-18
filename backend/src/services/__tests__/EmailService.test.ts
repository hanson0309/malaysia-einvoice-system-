// backend/src/services/__tests__/EmailService.test.ts
import { EmailService } from '../EmailService';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let mockSendMail: jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASSWORD = 'test-password';

    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when SMTP_USER is missing', () => {
      delete process.env.SMTP_USER;
      expect(() => new EmailService()).toThrow('SMTP credentials not configured');
    });

    it('should throw error when SMTP_PASSWORD is missing', () => {
      delete process.env.SMTP_PASSWORD;
      expect(() => new EmailService()).toThrow('SMTP credentials not configured');
    });

    it('should throw error when both SMTP credentials are missing', () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASSWORD;
      expect(() => new EmailService()).toThrow('SMTP credentials not configured');
    });

    it('should create transporter successfully with valid credentials', () => {
      expect(() => new EmailService()).not.toThrow();
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'test@example.com',
          pass: 'test-password',
        },
      });
    });
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

    it('should throw meaningful error when email sending fails', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP authentication failed'));
      const emailService = new EmailService();

      await expect(emailService.sendInvoice({
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
        pdfBuffer: Buffer.from('fake-pdf'),
      })).rejects.toThrow('Failed to send invoice email: SMTP authentication failed');
    });

    it('should throw meaningful error for network failures', async () => {
      mockSendMail.mockRejectedValue(new Error('Network timeout'));
      const emailService = new EmailService();

      await expect(emailService.sendInvoice({
        to: 'customer@example.com',
        invoice: {
          invoice_number: 'INV-002',
          issue_date: new Date('2026-05-17'),
          total_amount: 500,
        },
        customer: { name: 'Test Customer' },
        tenant: {
          company_name: 'Test Company',
          email: 'company@example.com',
          phone: '011-1111-1111',
        },
        pdfBuffer: Buffer.from('fake-pdf'),
      })).rejects.toThrow('Failed to send invoice email: Network timeout');
    });
  });
});
