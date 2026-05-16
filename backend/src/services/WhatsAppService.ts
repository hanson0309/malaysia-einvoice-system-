// backend/src/services/WhatsAppService.ts
interface GenerateLinkParams {
  phone: string;
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
    phone: string;
  };
  customMessage?: string;
}

export class WhatsAppService {
  static formatPhone(phone: string): string {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    let cleaned = phone.replace(/\D/g, '');

    if (!cleaned) {
      throw new Error('Invalid phone number format');
    }

    if (cleaned.startsWith('01')) {
      cleaned = '60' + cleaned.substring(1);
    }

    if (!cleaned.startsWith('60')) {
      throw new Error('Invalid phone number format');
    }

    return cleaned;
  }

  static generateInvoiceLink(params: GenerateLinkParams): string {
    const formattedPhone = this.formatPhone(params.phone);
    const message = params.customMessage || this.getDefaultMessage(params);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  private static getDefaultMessage(params: GenerateLinkParams): string {
    const { invoice, customer, tenant } = params;
    const issueDate = new Date(invoice.issue_date).toLocaleDateString('en-MY');
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-MY') : 'N/A';

    return `Hello ${customer.name},

Your invoice from ${tenant.company_name}:

📄 Invoice: ${invoice.invoice_number}
📅 Date: ${issueDate}
💰 Amount: RM ${invoice.total_amount.toFixed(2)}
⏰ Due: ${dueDate}

Please check your email for the PDF invoice.

Thank you!
${tenant.company_name}
${tenant.phone}`;
  }
}
