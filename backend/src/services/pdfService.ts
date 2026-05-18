import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_type: string;
  tax_rate: number;
}

interface InvoiceData {
  invoice_number: string;
  invoice_type: string;
  issue_date: string | Date;
  due_date?: string | Date;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postcode?: string;
    state_code?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  payment_method?: string;
}

export class PDFService {
  static generateInvoicePDFBuffer(invoice: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Build the PDF content
      this.buildInvoicePDF(doc, invoice);
      doc.end();
    });
  }

  static generateInvoicePDF(invoice: InvoiceData, res: Response) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=invoice-${invoice.invoice_number}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Build the PDF content
    this.buildInvoicePDF(doc, invoice);

    // Finalize PDF
    doc.end();
  }

  private static buildInvoicePDF(doc: typeof PDFDocument.prototype, invoice: InvoiceData) {
    // Header
    this.generateHeader(doc, invoice);

    // Customer Information
    this.generateCustomerInfo(doc, invoice);

    // Invoice Table
    this.generateInvoiceTable(doc, invoice);

    // Footer
    this.generateFooter(doc);
  }

  private static generateHeader(doc: typeof PDFDocument.prototype, invoice: InvoiceData) {
    doc
      .fontSize(20)
      .fillColor('#8b5cf6')
      .text('INVOICE', 50, 50, { align: 'left' })
      .fontSize(10)
      .fillColor('#64748b')
      .text(`Invoice #: ${invoice.invoice_number}`, 50, 80)
      .text(`Date: ${this.formatDate(invoice.issue_date)}`, 50, 95);

    if (invoice.due_date) {
      doc.text(`Due Date: ${this.formatDate(invoice.due_date)}`, 50, 110);
    }

    // Company info (right side)
    doc
      .fontSize(12)
      .fillColor('#1e293b')
      .text('Your Company Name', 350, 50, { align: 'right' })
      .fontSize(9)
      .fillColor('#64748b')
      .text('123 Business Street', 350, 70, { align: 'right' })
      .text('Kuala Lumpur, Malaysia', 350, 85, { align: 'right' })
      .text('contact@company.com', 350, 100, { align: 'right' });

    // Line separator
    doc
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .moveTo(50, 140)
      .lineTo(550, 140)
      .stroke();
  }

  private static generateCustomerInfo(doc: typeof PDFDocument.prototype, invoice: InvoiceData) {
    doc
      .fontSize(11)
      .fillColor('#1e293b')
      .text('Bill To:', 50, 160)
      .fontSize(10)
      .fillColor('#475569')
      .text(invoice.customer.name, 50, 180);

    let yPos = 195;

    if (invoice.customer.email) {
      doc.text(invoice.customer.email, 50, yPos);
      yPos += 15;
    }

    if (invoice.customer.phone) {
      doc.text(invoice.customer.phone, 50, yPos);
      yPos += 15;
    }

    if (invoice.customer.address_line1) {
      doc.text(invoice.customer.address_line1, 50, yPos);
      yPos += 15;
    }

    if (invoice.customer.address_line2) {
      doc.text(invoice.customer.address_line2, 50, yPos);
      yPos += 15;
    }

    if (invoice.customer.city || invoice.customer.postcode) {
      const cityPostcode = [
        invoice.customer.postcode,
        invoice.customer.city,
        invoice.customer.state_code
      ].filter(Boolean).join(' ');
      doc.text(cityPostcode, 50, yPos);
      yPos += 15;
    }

    return yPos + 20;
  }

  private static generateInvoiceTable(doc: typeof PDFDocument.prototype, invoice: InvoiceData) {
    const tableTop = 300;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 320;
    const priceX = 380;
    const taxX = 440;
    const amountX = 500;

    // Table Header
    doc
      .fontSize(9)
      .fillColor('#64748b')
      .text('DESCRIPTION', descriptionX, tableTop)
      .text('QTY', quantityX, tableTop)
      .text('PRICE', priceX, tableTop)
      .text('TAX', taxX, tableTop)
      .text('AMOUNT', amountX, tableTop);

    // Header line
    doc
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table Items
    let yPos = tableTop + 30;
    doc.fontSize(9).fillColor('#1e293b');

    invoice.items.forEach((item) => {
      const amount = item.quantity * item.unit_price;
      const taxAmount = (amount * item.tax_rate) / 100;

      doc
        .text(item.description, descriptionX, yPos, { width: 150 })
        .text(item.quantity.toString(), quantityX, yPos)
        .text(this.formatCurrency(item.unit_price, invoice.currency), priceX, yPos)
        .text(`${item.tax_rate}%`, taxX, yPos)
        .text(this.formatCurrency(amount + taxAmount, invoice.currency), amountX, yPos, { align: 'right' });

      yPos += 25;
    });

    // Totals section
    const totalsTop = yPos + 20;

    doc
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .moveTo(350, totalsTop)
      .lineTo(550, totalsTop)
      .stroke();

    doc
      .fontSize(9)
      .fillColor('#64748b')
      .text('Subtotal:', 380, totalsTop + 15)
      .text('Tax:', 380, totalsTop + 35)
      .fontSize(11)
      .fillColor('#1e293b')
      .text('Total:', 380, totalsTop + 60);

    doc
      .fontSize(9)
      .fillColor('#475569')
      .text(this.formatCurrency(invoice.subtotal, invoice.currency), 480, totalsTop + 15, { align: 'right' })
      .text(this.formatCurrency(invoice.tax, invoice.currency), 480, totalsTop + 35, { align: 'right' })
      .fontSize(11)
      .fillColor('#1e293b')
      .text(this.formatCurrency(invoice.total, invoice.currency), 480, totalsTop + 60, { align: 'right' });

    // Total box
    doc
      .strokeColor('#8b5cf6')
      .lineWidth(2)
      .rect(370, totalsTop + 50, 180, 35)
      .stroke();
  }

  private static generateFooter(doc: typeof PDFDocument.prototype) {
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        'Thank you for your business!',
        50,
        750,
        { align: 'center', width: 500 }
      )
      .text(
        'For any questions, please contact us at contact@company.com',
        50,
        765,
        { align: 'center', width: 500 }
      );
  }

  private static formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency || 'MYR'
    }).format(amount);
  }

  private static formatDate(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
}
