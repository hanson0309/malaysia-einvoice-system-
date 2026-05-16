// backend/src/services/EmailService.ts
import nodemailer from 'nodemailer';

interface SendInvoiceParams {
  to: string;
  invoice: {
    invoice_number: string;
    issue_date: Date;
    due_date?: Date;
    total_amount: number;
  };
  customer: {
    name: string;
  };
  tenant: {
    company_name: string;
    email: string;
    phone: string;
  };
  pdfBuffer: Buffer;
  customSubject?: string;
  customMessage?: string;
}

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendInvoice(params: SendInvoiceParams): Promise<{ success: boolean }> {
    if (!this.isValidEmail(params.to)) {
      throw new Error('Invalid email address');
    }

    const subject = params.customSubject || this.getDefaultSubject(params);
    const html = params.customMessage || this.getDefaultHtml(params);

    await this.transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME || 'MyInvois System'} <${process.env.SMTP_USER}>`,
      to: params.to,
      subject,
      html,
      attachments: [
        {
          filename: `Invoice-${params.invoice.invoice_number}.pdf`,
          content: params.pdfBuffer,
        },
      ],
    });

    return { success: true };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getDefaultSubject(params: SendInvoiceParams): string {
    return `Invoice #${params.invoice.invoice_number} from ${params.tenant.company_name} - RM ${params.invoice.total_amount.toFixed(2)}`;
  }

  private getDefaultHtml(params: SendInvoiceParams): string {
    const { invoice, customer, tenant } = params;
    const issueDate = new Date(invoice.issue_date).toLocaleDateString('en-MY');
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-MY') : 'N/A';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Invoice from ${tenant.company_name}</h2>
        <p>Dear ${customer.name},</p>
        <p>Please find your invoice details below:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Issue Date:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${issueDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${dueDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>RM ${invoice.total_amount.toFixed(2)}</strong></td>
          </tr>
        </table>
        <p>The invoice is attached as a PDF file.</p>
        <p>If you have any questions, please contact us:</p>
        <p>Email: ${tenant.email}<br>Phone: ${tenant.phone}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">Powered by MyInvois</p>
      </div>
    `;
  }
}
