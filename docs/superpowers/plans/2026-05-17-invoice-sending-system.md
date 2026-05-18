# Invoice Sending System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add invoice sending capabilities via Email and WhatsApp to transform the system from a tax filing tool into a complete B2B invoice management system.

**Architecture:** Backend services (EmailService, WhatsAppService) handle sending logic. New InvoiceSending model tracks history. Frontend components (SendInvoiceModal, SendingHistoryPanel) provide UI. Customer management UI restored.

**Tech Stack:** Nodemailer (Gmail SMTP), wa.me links (free WhatsApp), MongoDB/Mongoose, React/TypeScript, Framer Motion

---

## File Structure

### Backend Files to Create
- `backend/src/models/InvoiceSending.ts` - Sending history model
- `backend/src/services/EmailService.ts` - Email sending via Nodemailer
- `backend/src/services/WhatsAppService.ts` - WhatsApp link generation
- `backend/src/routes/sending-history.ts` - Sending history API endpoints
- `backend/src/services/__tests__/EmailService.test.ts` - Email service tests
- `backend/src/services/__tests__/WhatsAppService.test.ts` - WhatsApp service tests

### Backend Files to Modify
- `backend/src/models/index.ts` - Export InvoiceSending model
- `backend/src/routes/index.ts` - Register sending-history routes
- `backend/src/routes/invoices.ts` - Add send and sending-history endpoints
- `backend/.env` - Add SMTP configuration

### Frontend Files to Create
- `frontend/src/components/SendInvoiceModal.tsx` - Invoice sending modal
- `frontend/src/components/SendingHistoryPanel.tsx` - Sending history display
- `frontend/src/components/WhatsAppLinkButton.tsx` - WhatsApp link button
- `frontend/src/pages/CustomersPage.tsx` - Customer list page (restore)
- `frontend/src/pages/CustomerFormPage.tsx` - Customer form page (restore)

### Frontend Files to Modify
- `frontend/src/lib/api.ts` - Add sending API functions
- `frontend/src/pages/InvoiceDetailPage.tsx` - Add Send button and history panel
- `frontend/src/components/DashboardLayout.tsx` - Restore Customers navigation
- `frontend/src/App.tsx` - Add customer routes

---

### Task 1: InvoiceSending Model

**Files:**
- Create: `backend/src/models/InvoiceSending.ts`
- Test: `backend/src/models/__tests__/InvoiceSending.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/models/__tests__/InvoiceSending.test.ts
import mongoose from 'mongoose';
import { InvoiceSending } from '../InvoiceSending';

describe('InvoiceSending Model', () => {
  it('should create a sending record with required fields', async () => {
    const sendingData = {
      tenant_id: new mongoose.Types.ObjectId(),
      invoice_id: new mongoose.Types.ObjectId(),
      customer_id: new mongoose.Types.ObjectId(),
      send_method: 'email',
      email_sent: false,
      email_status: 'pending',
      email_to: 'test@example.com',
      whatsapp_link_generated: false,
      whatsapp_phone: '',
      sent_by: new mongoose.Types.ObjectId(),
    };

    const sending = await InvoiceSending.create(sendingData);
    expect(sending.tenant_id).toEqual(sendingData.tenant_id);
    expect(sending.send_method).toBe('email');
    expect(sending.email_status).toBe('pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- InvoiceSending.test.ts`
Expected: FAIL with "Cannot find module '../InvoiceSending'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/models/InvoiceSending.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceSending extends Document {
  tenant_id: mongoose.Types.ObjectId;
  invoice_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  send_method: 'email' | 'whatsapp' | 'both';
  email_sent: boolean;
  email_sent_at?: Date;
  email_status: 'pending' | 'sent' | 'failed';
  email_error_message?: string;
  email_to: string;
  whatsapp_link_generated: boolean;
  whatsapp_link?: string;
  whatsapp_phone: string;
  sent_by: mongoose.Types.ObjectId;
  pdf_url?: string;
  created_at: Date;
  updated_at: Date;
}

const InvoiceSendingSchema = new Schema<IInvoiceSending>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    send_method: { type: String, required: true, enum: ['email', 'whatsapp', 'both'] },
    email_sent: { type: Boolean, required: true, default: false },
    email_sent_at: { type: Date },
    email_status: { type: String, required: true, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    email_error_message: { type: String },
    email_to: { type: String, required: true },
    whatsapp_link_generated: { type: Boolean, required: true, default: false },
    whatsapp_link: { type: String },
    whatsapp_phone: { type: String, required: true },
    sent_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pdf_url: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

InvoiceSendingSchema.index({ tenant_id: 1, invoice_id: 1 });
InvoiceSendingSchema.index({ tenant_id: 1, customer_id: 1 });
InvoiceSendingSchema.index({ tenant_id: 1, created_at: -1 });

export const InvoiceSending = mongoose.model<IInvoiceSending>('InvoiceSending', InvoiceSendingSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- InvoiceSending.test.ts`
Expected: PASS

- [ ] **Step 5: Export model from index**

```typescript
// backend/src/models/index.ts
// Add this line to existing exports
export { InvoiceSending, IInvoiceSending } from './InvoiceSending';
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/InvoiceSending.ts backend/src/models/__tests__/InvoiceSending.test.ts backend/src/models/index.ts
git commit -m "feat: add InvoiceSending model for tracking invoice sending history"
```

---

### Task 2: WhatsApp Service

**Files:**
- Create: `backend/src/services/WhatsAppService.ts`
- Test: `backend/src/services/__tests__/WhatsAppService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- WhatsAppService.test.ts`
Expected: FAIL with "Cannot find module '../WhatsAppService'"

- [ ] **Step 3: Write minimal implementation**

```typescript
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
      cleaned = '60' + cleaned;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- WhatsAppService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/WhatsAppService.ts backend/src/services/__tests__/WhatsAppService.test.ts
git commit -m "feat: add WhatsApp link generation service"
```

### Task 3: Email Service

**Files:**
- Create: `backend/src/services/EmailService.ts`
- Test: `backend/src/services/__tests__/EmailService.test.ts`

- [ ] **Step 1: Install nodemailer**

Run: `cd backend && npm install nodemailer && npm install --save-dev @types/nodemailer`
Expected: Package installed successfully

- [ ] **Step 2: Write the failing test**

```typescript
// backend/src/services/__tests__/EmailService.test.ts
import { EmailService } from '../EmailService';

describe('EmailService', () => {
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npm test -- EmailService.test.ts`
Expected: FAIL with "Cannot find module '../EmailService'"

- [ ] **Step 4: Write minimal implementation**

```typescript
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npm test -- EmailService.test.ts`
Expected: PASS

- [ ] **Step 6: Add SMTP configuration to .env**

```bash
# backend/.env
# Add these lines (user will need to configure with their Gmail credentials)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=MyInvois System
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/EmailService.ts backend/src/services/__tests__/EmailService.test.ts backend/.env
git commit -m "feat: add email sending service with Nodemailer"
```

---

### Task 4: Invoice Send Endpoint

**Files:**
- Modify: `backend/src/routes/invoices.ts`
- Test: `backend/src/routes/__tests__/invoices.send.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/routes/__tests__/invoices.send.test.ts
import request from 'supertest';
import { app } from '../../app';
import { Invoice, Customer, InvoiceSending } from '../../models';

describe('POST /api/v1/invoices/:id/send', () => {
  let authToken: string;
  let invoiceId: string;
  let customerId: string;

  beforeEach(async () => {
    // Setup test data
    const customer = await Customer.create({
      tenant_id: 'test-tenant-id',
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '012-345-6789',
      registration_no: '123456',
      id_type: 'NRIC',
      customer_type: 'B2B',
    });
    customerId = customer._id.toString();

    const invoice = await Invoice.create({
      tenant_id: 'test-tenant-id',
      invoice_number: 'INV-001',
      invoice_type: '01',
      customer_id: customerId,
      issue_date: new Date(),
      subtotal: 1000,
      tax_amount: 60,
      total_amount: 1060,
      items: [],
      status: 'draft',
    });
    invoiceId = invoice._id.toString();
  });

  it('should send invoice via email', async () => {
    const response = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/send`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        send_method: 'email',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email_sent).toBe(true);

    const sendingRecord = await InvoiceSending.findOne({ invoice_id: invoiceId });
    expect(sendingRecord).toBeTruthy();
    expect(sendingRecord?.email_status).toBe('sent');
  });

  it('should generate WhatsApp link', async () => {
    const response = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/send`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        send_method: 'whatsapp',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.whatsapp_link).toMatch(/^https:\/\/wa\.me\//);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- invoices.send.test.ts`
Expected: FAIL with "Cannot POST /api/v1/invoices/:id/send"

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/routes/invoices.ts
// Add these imports at the top
import { EmailService } from '../services/EmailService';
import { WhatsAppService } from '../services/WhatsAppService';
import { InvoiceSending } from '../models';
import { Tenant } from '../models/Tenant';

// Add this route before the export statement
router.post('/:id/send', async (req: AuthRequest, res, next) => {
  try {
    const { send_method, email_subject, email_message, whatsapp_message } = req.body;

    if (!['email', 'whatsapp', 'both'].includes(send_method)) {
      throw new ValidationError('Invalid send_method. Must be email, whatsapp, or both');
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    }).populate('customer_id');

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const customer = invoice.customer_id as any;
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    const sendingRecord = await InvoiceSending.create({
      tenant_id: req.tenantId,
      invoice_id: invoice._id,
      customer_id: customer._id,
      send_method,
      email_sent: false,
      email_status: 'pending',
      email_to: customer.email || '',
      whatsapp_link_generated: false,
      whatsapp_phone: customer.phone || '',
      sent_by: req.userId,
    });

    let emailSent = false;
    let whatsappLink: string | undefined;

    if (send_method === 'email' || send_method === 'both') {
      if (!customer.email) {
        throw new ValidationError('Customer email is missing');
      }

      try {
        const pdfBuffer = await PDFService.generateInvoicePDFBuffer({
          invoice_number: invoice.invoice_number,
          invoice_type: invoice.invoice_type,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address_line1: customer.address_line1,
            address_line2: customer.address_line2,
            city: customer.city,
            postcode: customer.postcode,
            state_code: customer.state_code,
          },
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax_amount,
          total: invoice.total_amount,
          currency: invoice.currency,
          payment_method: invoice.payment_method,
        });

        const emailService = new EmailService();
        await emailService.sendInvoice({
          to: customer.email,
          invoice: {
            invoice_number: invoice.invoice_number,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            total_amount: invoice.total_amount,
          },
          customer: { name: customer.name },
          tenant: {
            company_name: tenant.company_name,
            email: tenant.email,
            phone: tenant.phone,
          },
          pdfBuffer,
          customSubject: email_subject,
          customMessage: email_message,
        });

        await InvoiceSending.updateOne(
          { _id: sendingRecord._id },
          {
            email_sent: true,
            email_sent_at: new Date(),
            email_status: 'sent',
          }
        );

        emailSent = true;
      } catch (error: any) {
        await InvoiceSending.updateOne(
          { _id: sendingRecord._id },
          {
            email_status: 'failed',
            email_error_message: error.message,
          }
        );
      }
    }

    if (send_method === 'whatsapp' || send_method === 'both') {
      if (!customer.phone) {
        throw new ValidationError('Customer phone number is missing');
      }

      try {
        whatsappLink = WhatsAppService.generateInvoiceLink({
          phone: customer.phone,
          invoice: {
            invoice_number: invoice.invoice_number,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            total_amount: invoice.total_amount,
          },
          customer: { name: customer.name },
          tenant: {
            company_name: tenant.company_name,
            phone: tenant.phone,
          },
          customMessage: whatsapp_message,
        });

        await InvoiceSending.updateOne(
          { _id: sendingRecord._id },
          {
            whatsapp_link_generated: true,
            whatsapp_link: whatsappLink,
          }
        );
      } catch (error: any) {
        throw new ValidationError(`WhatsApp link generation failed: ${error.message}`);
      }
    }

    res.json({
      success: true,
      data: {
        sending_id: sendingRecord._id,
        email_sent: emailSent,
        whatsapp_link: whatsappLink,
      },
    });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 4: Add PDF buffer generation to PDFService**

```typescript
// backend/src/services/pdfService.ts
// Add this method to the PDFService class
static async generateInvoicePDFBuffer(invoiceData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Use existing PDF generation logic
    this.buildInvoicePDF(doc, invoiceData);
    doc.end();
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npm test -- invoices.send.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/invoices.ts backend/src/routes/__tests__/invoices.send.test.ts backend/src/services/pdfService.ts
git commit -m "feat: add invoice send endpoint with email and WhatsApp"
```

---

### Task 5: Sending History Endpoint

**Files:**
- Modify: `backend/src/routes/invoices.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/routes/__tests__/invoices.sending-history.test.ts
import request from 'supertest';
import { app } from '../../app';
import { Invoice, Customer, InvoiceSending } from '../../models';

describe('GET /api/v1/invoices/:id/sending-history', () => {
  let authToken: string;
  let invoiceId: string;

  beforeEach(async () => {
    // Setup test data with sending history
  });

  it('should return sending history for invoice', async () => {
    const response = await request(app)
      .get(`/api/v1/invoices/${invoiceId}/sending-history`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- invoices.sending-history.test.ts`
Expected: FAIL with "Cannot GET /api/v1/invoices/:id/sending-history"

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/routes/invoices.ts
// Add this route after the send endpoint
router.get('/:id/sending-history', async (req: AuthRequest, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: null,
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const history = await InvoiceSending.find({
      tenant_id: req.tenantId,
      invoice_id: req.params.id,
    })
      .populate('sent_by', 'name email')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- invoices.sending-history.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/invoices.ts backend/src/routes/__tests__/invoices.sending-history.test.ts
git commit -m "feat: add sending history endpoint for invoices"
```

---

### Task 6: Frontend API Functions

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add TypeScript interfaces**

```typescript
// frontend/src/lib/api.ts
// Add these interfaces after existing interfaces
export interface SendInvoiceData {
  send_method: 'email' | 'whatsapp' | 'both';
  email_subject?: string;
  email_message?: string;
  whatsapp_message?: string;
}

export interface SendInvoiceResponse {
  success: boolean;
  data: {
    sending_id: string;
    email_sent: boolean;
    whatsapp_link?: string;
  };
}

export interface SendingHistoryItem {
  _id: string;
  send_method: 'email' | 'whatsapp' | 'both';
  email_sent: boolean;
  email_sent_at?: string;
  email_status: 'pending' | 'sent' | 'failed';
  email_error_message?: string;
  email_to: string;
  whatsapp_link_generated: boolean;
  whatsapp_link?: string;
  whatsapp_phone: string;
  sent_by: {
    name: string;
    email: string;
  };
  created_at: string;
}
```

- [ ] **Step 2: Add API functions**

```typescript
// frontend/src/lib/api.ts
// Add to invoiceApi object
export const invoiceApi = {
  // ... existing methods
  send: (id: string, data: SendInvoiceData) => 
    api.post<SendInvoiceResponse>(`/invoices/${id}/send`, data),
  getSendingHistory: (id: string) => 
    api.get<{ success: boolean; data: SendingHistoryItem[] }>(`/invoices/${id}/sending-history`),
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add invoice sending API functions"
```

### Task 7: WhatsApp Link Button Component

**Files:**
- Create: `frontend/src/components/WhatsAppLinkButton.tsx`

- [ ] **Step 1: Create component**

```typescript
// frontend/src/components/WhatsAppLinkButton.tsx
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface WhatsAppLinkButtonProps {
  link: string;
  label?: string;
}

export default function WhatsAppLinkButton({ link, label = 'Open WhatsApp' }: WhatsAppLinkButtonProps) {
  const handleClick = () => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
        border: 'none',
        color: 'white',
        fontWeight: 600,
        fontSize: '0.875rem',
        cursor: 'pointer',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageCircle style={{ width: '16px', height: '16px' }} />
      {label}
    </motion.button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/WhatsAppLinkButton.tsx
git commit -m "feat: add WhatsApp link button component"
```

---

### Task 8: Sending History Panel Component

**Files:**
- Create: `frontend/src/components/SendingHistoryPanel.tsx`

- [ ] **Step 1: Create component**

```typescript
// frontend/src/components/SendingHistoryPanel.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Mail, MessageCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { invoiceApi, type SendingHistoryItem } from '../lib/api';
import WhatsAppLinkButton from './WhatsAppLinkButton';

interface SendingHistoryPanelProps {
  invoiceId: string;
}

export default function SendingHistoryPanel({ invoiceId }: SendingHistoryPanelProps) {
  const [history, setHistory] = useState<SendingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [invoiceId]);

  const loadHistory = async () => {
    try {
      const response = await invoiceApi.getSendingHistory(invoiceId);
      setHistory(response.data.data);
    } catch (error) {
      console.error('Failed to load sending history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
        Loading history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#94a3b8',
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '1rem',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
      >
        <AlertCircle style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
        <p>No sending history yet</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.9)',
        borderRadius: '1.5rem',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        padding: '2rem',
      }}
    >
      <h3
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#f1f5f9',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <Clock style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
        Sending History
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {history.map((record, index) => (
          <motion.div
            key={record._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
              padding: '1.5rem',
              borderRadius: '1rem',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {record.send_method === 'email' && <Mail style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />}
                  {record.send_method === 'whatsapp' && <MessageCircle style={{ width: '16px', height: '16px', color: '#25D366' }} />}
                  {record.send_method === 'both' && (
                    <>
                      <Mail style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                      <MessageCircle style={{ width: '16px', height: '16px', color: '#25D366' }} />
                    </>
                  )}
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9', textTransform: 'capitalize' }}>
                    {record.send_method === 'both' ? 'Email + WhatsApp' : record.send_method}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {new Date(record.created_at).toLocaleString('en-MY')}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  by {record.sent_by.name}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                {(record.send_method === 'email' || record.send_method === 'both') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {record.email_status === 'sent' && (
                      <>
                        <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
                        <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>Email Sent</span>
                      </>
                    )}
                    {record.email_status === 'failed' && (
                      <>
                        <XCircle style={{ width: '16px', height: '16px', color: '#ef4444' }} />
                        <span
                          style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 600 }}
                          title={record.email_error_message}
                        >
                          Email Failed
                        </span>
                      </>
                    )}
                    {record.email_status === 'pending' && (
                      <>
                        <Clock style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
                        <span style={{ fontSize: '0.875rem', color: '#f59e0b', fontWeight: 600 }}>Pending</span>
                      </>
                    )}
                  </div>
                )}

                {record.whatsapp_link && (
                  <WhatsAppLinkButton link={record.whatsapp_link} label="Open WhatsApp" />
                )}
              </div>
            </div>

            {record.email_error_message && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <p style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                  Error: {record.email_error_message}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/SendingHistoryPanel.tsx
git commit -m "feat: add sending history panel component"
```

### Task 9: Send Invoice Modal Component (Part 1)

**Files:**
- Create: `frontend/src/components/SendInvoiceModal.tsx`

- [ ] **Step 1: Create modal structure and state**

```typescript
// frontend/src/components/SendInvoiceModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, MessageCircle, Send, Loader } from 'lucide-react';
import { invoiceApi, type SendInvoiceData } from '../lib/api';
import WhatsAppLinkButton from './WhatsAppLinkButton';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    _id: string;
    invoice_number: string;
    total_amount: number;
  };
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  onSuccess: () => void;
}

export default function SendInvoiceModal({ isOpen, onClose, invoice, customer, onSuccess }: SendInvoiceModalProps) {
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp' | 'both'>('email');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const handleSend = async () => {
    setError(null);
    setIsSending(true);

    try {
      const data: SendInvoiceData = {
        send_method: sendMethod,
        email_subject: emailSubject || undefined,
        email_message: emailMessage || undefined,
        whatsapp_message: whatsappMessage || undefined,
      };

      const response = await invoiceApi.send(invoice._id, data);

      if (response.data.data.whatsapp_link) {
        setWhatsappLink(response.data.data.whatsapp_link);
      }

      if (sendMethod === 'email' || (sendMethod === 'both' && response.data.data.email_sent)) {
        alert('Invoice sent successfully!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invoice');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  // Component JSX continues in next step
  return null;
};
```

- [ ] **Step 2: Commit part 1**

```bash
git add frontend/src/components/SendInvoiceModal.tsx
git commit -m "feat: add send invoice modal component (part 1 - state)"
```

### Task 10: Send Invoice Modal Component (Part 2)

**Files:**
- Modify: `frontend/src/components/SendInvoiceModal.tsx`

- [ ] **Step 1: Add modal JSX**

Replace the `return null;` at the end with:

```typescript
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '2rem',
              borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                Send Invoice
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                {invoice.invoice_number} • {customer.name}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          {/* Body - continues in next chunk */}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
```

- [ ] **Step 2: Commit part 2**

```bash
git add frontend/src/components/SendInvoiceModal.tsx
git commit -m "feat: add send invoice modal component (part 2 - modal structure)"
```

---

### Task 11: Send Invoice Modal Component (Part 3)

**Files:**
- Modify: `frontend/src/components/SendInvoiceModal.tsx`

- [ ] **Step 1: Add modal body content**

Replace the `{/* Body - continues in next chunk */}` comment with:

```typescript
          {/* Body */}
          <div style={{ padding: '2rem' }}>
            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  marginBottom: '1.5rem',
                }}
              >
                <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>
              </motion.div>
            )}

            {/* WhatsApp Link Success */}
            {whatsappLink && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(37, 211, 102, 0.1)',
                  border: '1px solid rgba(37, 211, 102, 0.3)',
                  marginBottom: '1.5rem',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#10b981', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  WhatsApp link generated successfully!
                </p>
                <WhatsAppLinkButton link={whatsappLink} label="Open WhatsApp" />
              </motion.div>
            )}

            {/* Send Method Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
                Send Method *
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {[
                  { value: 'email', icon: Mail, label: 'Email', color: '#8b5cf6' },
                  { value: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: '#25D366' },
                  { value: 'both', icon: Send, label: 'Both', color: '#f59e0b' },
                ].map((method) => {
                  const Icon = method.icon;
                  const isSelected = sendMethod === method.value;
                  return (
                    <motion.button
                      key={method.value}
                      onClick={() => setSendMethod(method.value as any)}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: isSelected ? `${method.color}20` : 'rgba(30, 41, 59, 0.5)',
                        border: `2px solid ${isSelected ? method.color : 'rgba(139, 92, 246, 0.2)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon style={{ width: '24px', height: '24px', color: isSelected ? method.color : '#94a3b8' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? method.color : '#94a3b8' }}>
                        {method.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Email Fields */}
            {(sendMethod === 'email' || sendMethod === 'both') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: '1.5rem' }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Email Subject (Optional)
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={`Invoice #${invoice.invoice_number} from your company`}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#f1f5f9',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Email Message (Optional)
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Custom message for the email body..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#f1f5f9',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* WhatsApp Message Field */}
            {(sendMethod === 'whatsapp' || sendMethod === 'both') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: '1.5rem' }}
              >
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                  WhatsApp Message (Optional)
                </label>
                <textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Custom message for WhatsApp..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                  }}
                />
              </motion.div>
            )}

            {/* Send Button */}
            <motion.button
              onClick={handleSend}
              disabled={isSending}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.75rem',
                background: isSending
                  ? 'rgba(139, 92, 246, 0.5)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none',
                color: 'white',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: isSending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              whileHover={!isSending ? { scale: 1.02 } : {}}
              whileTap={!isSending ? { scale: 0.98 } : {}}
            >
              {isSending ? (
                <>
                  <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                  Sending...
                </>
              ) : (
                <>
                  <Send style={{ width: '20px', height: '20px' }} />
                  Send Invoice
                </>
              )}
            </motion.button>
          </div>
```

- [ ] **Step 2: Commit part 3**

```bash
git add frontend/src/components/SendInvoiceModal.tsx
git commit -m "feat: add send invoice modal component (part 3 - complete modal body)"
```

---

### Task 12: Integrate Send Button in Invoice Detail Page

**Files:**
- Modify: `frontend/src/pages/InvoiceDetailPage.tsx`

- [ ] **Step 1: Add imports and state**

Add these imports at the top:

```typescript
import SendInvoiceModal from '../components/SendInvoiceModal';
import SendingHistoryPanel from '../components/SendingHistoryPanel';
import { Send } from 'lucide-react';
```

Add state after existing state declarations:

```typescript
const [isSendModalOpen, setIsSendModalOpen] = useState(false);
const [sendingHistoryKey, setSendingHistoryKey] = useState(0);
```

- [ ] **Step 2: Add Send button in header**

Find the header section with the "Submit to IRB" button and add the Send button next to it:

```typescript
<motion.button
  onClick={() => setIsSendModalOpen(true)}
  style={{
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  <Send style={{ width: '18px', height: '18px' }} />
  Send to Customer
</motion.button>
```

- [ ] **Step 3: Add modal and history panel at the end**

Before the closing `</div>` of the main container, add:

```typescript
{/* Send Invoice Modal */}
{invoice && customer && (
  <SendInvoiceModal
    isOpen={isSendModalOpen}
    onClose={() => setIsSendModalOpen(false)}
    invoice={{
      _id: invoice._id,
      invoice_number: invoice.invoice_number,
      total_amount: invoice.total_amount,
    }}
    customer={{
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    }}
    onSuccess={() => {
      setSendingHistoryKey((prev) => prev + 1);
      setIsSendModalOpen(false);
    }}
  />
)}

{/* Sending History */}
{invoice && (
  <div style={{ marginTop: '2rem' }}>
    <SendingHistoryPanel key={sendingHistoryKey} invoiceId={invoice._id} />
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/InvoiceDetailPage.tsx
git commit -m "feat: integrate send button and history panel in invoice detail page"
```

---

### Task 13: Restore Customers Navigation

**Files:**
- Modify: `frontend/src/components/DashboardLayout.tsx`

- [ ] **Step 1: Add Customers to navigation**

Find the navigation array and add the Customers item:

```typescript
import { Users } from 'lucide-react';

// In the navigation array
{
  name: 'Customers',
  href: '/dashboard/customers',
  icon: Users,
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/DashboardLayout.tsx
git commit -m "feat: restore customers navigation in dashboard"
```

---

### Task 14: Add Customer Routes

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Import customer pages**

```typescript
import CustomersPage from './pages/CustomersPage';
import CustomerFormPage from './pages/CustomerFormPage';
```

- [ ] **Step 2: Add routes**

Add these routes inside the dashboard Routes:

```typescript
<Route path="/dashboard/customers" element={<CustomersPage />} />
<Route path="/dashboard/customers/new" element={<CustomerFormPage />} />
<Route path="/dashboard/customers/:id/edit" element={<CustomerFormPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add customer management routes"
```

---

### Task 15: Create Customers Page

**Files:**
- Create: `frontend/src/pages/CustomersPage.tsx`

- [ ] **Step 1: Create the component (part 1 - imports and state)**

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  User as UserIcon,
} from 'lucide-react';
import { customerApi } from '../lib/api';

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  customer_type: 'B2B' | 'B2C';
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customerApi.getAll();
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      await customerApi.delete(id);
      setCustomers(customers.filter((c) => c._id !== id));
    } catch (error) {
      console.error('Failed to delete customer:', error);
      alert('Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  // Component JSX continues in next step
  return null;
}
```

- [ ] **Step 2: Commit part 1**

```bash
git add frontend/src/pages/CustomersPage.tsx
git commit -m "feat: create customers page (part 1 - state and logic)"
```

- [ ] **Step 3: Add JSX (part 2 - header and search)**

Replace the `return null;` with:

```typescript
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '64px',
            height: '64px',
            border: '4px solid rgba(139, 92, 246, 0.3)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                background: 'linear-gradient(90deg, #f1f5f9 0%, #8b5cf6 50%, #f1f5f9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Customers
            </h1>
            <p style={{ fontSize: '1rem', color: '#94a3b8' }}>Manage your customer database</p>
          </div>
          <Link to="/dashboard/customers/new" style={{ textDecoration: 'none' }}>
            <motion.button
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus style={{ width: '20px', height: '20px' }} />
              Add Customer
            </motion.button>
          </Link>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 3rem',
                borderRadius: '1rem',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#f1f5f9',
                fontSize: '1rem',
              }}
            />
          </div>
        </motion.div>

        {/* Customer List - continues in next step */}
      </div>
    </div>
  );
```

- [ ] **Step 4: Commit part 2**

```bash
git add frontend/src/pages/CustomersPage.tsx
git commit -m "feat: create customers page (part 2 - header and search)"
```

- [ ] **Step 5: Add customer list (part 3)**

Before the closing `</div></div>` tags, add:

```typescript
        {/* Customer List */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredCustomers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '3rem',
                textAlign: 'center',
                background: 'rgba(30, 41, 59, 0.9)',
                borderRadius: '1rem',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <Users style={{ width: '64px', height: '64px', margin: '0 auto 1rem', color: '#94a3b8', opacity: 0.5 }} />
              <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
                {searchQuery ? 'No customers found' : 'No customers yet. Add your first customer!'}
              </p>
            </motion.div>
          ) : (
            filteredCustomers.map((customer, index) => (
              <motion.div
                key={customer._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>{customer.name}</h3>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: customer.customer_type === 'B2B' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: customer.customer_type === 'B2B' ? '#8b5cf6' : '#10b981',
                          border: `1px solid ${customer.customer_type === 'B2B' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        }}
                      >
                        {customer.customer_type}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {customer.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                          <Mail style={{ width: '16px', height: '16px' }} />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                          <Phone style={{ width: '16px', height: '16px' }} />
                          {customer.phone}
                        </div>
                      )}
                      {customer.address_line1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                          <MapPin style={{ width: '16px', height: '16px' }} />
                          {customer.address_line1}, {customer.city}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/dashboard/customers/${customer._id}/edit`}>
                      <motion.button
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          background: 'rgba(139, 92, 246, 0.2)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#8b5cf6',
                          cursor: 'pointer',
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Edit style={{ width: '18px', height: '18px' }} />
                      </motion.button>
                    </Link>
                    <motion.button
                      onClick={() => handleDelete(customer._id)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 style={{ width: '18px', height: '18px' }} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
```

- [ ] **Step 6: Commit part 3**

```bash
git add frontend/src/pages/CustomersPage.tsx
git commit -m "feat: create customers page (part 3 - complete customer list)"
```

---

### Task 16: Create Customer Form Page

**Files:**
- Create: `frontend/src/pages/CustomerFormPage.tsx`

- [ ] **Step 1: Create component structure (part 1)**

```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X, User, Building2 } from 'lucide-react';
import { customerApi } from '../lib/api';

const MALAYSIAN_STATES = [
  { code: '01', name: 'Johor' },
  { code: '02', name: 'Kedah' },
  { code: '03', name: 'Kelantan' },
  { code: '04', name: 'Melaka' },
  { code: '05', name: 'Negeri Sembilan' },
  { code: '06', name: 'Pahang' },
  { code: '07', name: 'Pulau Pinang' },
  { code: '08', name: 'Perak' },
  { code: '09', name: 'Perlis' },
  { code: '10', name: 'Selangor' },
  { code: '11', name: 'Terengganu' },
  { code: '12', name: 'Sabah' },
  { code: '13', name: 'Sarawak' },
  { code: '14', name: 'Wilayah Persekutuan Kuala Lumpur' },
  { code: '15', name: 'Wilayah Persekutuan Labuan' },
  { code: '16', name: 'Wilayah Persekutuan Putrajaya' },
];

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(!!id);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    registration_no: '',
    id_type: 'NRIC',
    customer_type: 'B2B',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    state_code: '10',
  });

  useEffect(() => {
    if (id) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      const response = await customerApi.getById(id!);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Failed to load customer:', error);
      alert('Failed to load customer');
      navigate('/dashboard/customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (id) {
        await customerApi.update(id, formData);
      } else {
        await customerApi.create(formData);
      }
      navigate('/dashboard/customers');
    } catch (error) {
      console.error('Failed to save customer:', error);
      alert('Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  // JSX continues in next step
  return null;
}
```

- [ ] **Step 2: Commit part 1**

```bash
git add frontend/src/pages/CustomerFormPage.tsx
git commit -m "feat: create customer form page (part 1 - state and logic)"
```

- [ ] **Step 3: Add form JSX (part 2 - header and basic fields)**

Replace `return null;` with the form structure. Due to size, this will be split into multiple commits.

First, add the loading state and form header:

```typescript
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '64px',
            height: '64px',
            border: '4px solid rgba(139, 92, 246, 0.3)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem' }}
        >
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              background: 'linear-gradient(90deg, #f1f5f9 0%, #8b5cf6 50%, #f1f5f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {id ? 'Edit Customer' : 'Add Customer'}
          </h1>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(30, 41, 59, 0.9)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            padding: '2rem',
          }}
        >
          {/* Form fields continue in next step */}
        </motion.form>
      </div>
    </div>
  );
```

- [ ] **Step 4: Commit part 2**

```bash
git add frontend/src/pages/CustomerFormPage.tsx
git commit -m "feat: create customer form page (part 2 - form structure)"
```

- [ ] **Step 5: Add form fields (part 3 - basic info)**

Inside the `<motion.form>` tag, add the basic information fields:

```typescript
          {/* Customer Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
              Customer Type *
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[
                { value: 'B2B', icon: Building2, label: 'Business (B2B)' },
                { value: 'B2C', icon: User, label: 'Individual (B2C)' },
              ].map((type) => {
                const Icon = type.icon;
                const isSelected = formData.customer_type === type.value;
                return (
                  <motion.button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, customer_type: type.value as any })}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                      border: `2px solid ${isSelected ? '#8b5cf6' : 'rgba(139, 92, 246, 0.2)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon style={{ width: '20px', height: '20px', color: isSelected ? '#8b5cf6' : '#94a3b8' }} />
                    <span style={{ fontWeight: 600, color: isSelected ? '#8b5cf6' : '#94a3b8' }}>{type.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#f1f5f9',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Email and Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                }}
              />
            </div>
          </div>
```

- [ ] **Step 6: Commit part 3**

```bash
git add frontend/src/pages/CustomerFormPage.tsx
git commit -m "feat: create customer form page (part 3 - basic info fields)"
```

- [ ] **Step 7: Add registration fields (part 4)**

Continue adding fields inside the form:

```typescript
          {/* Registration No and ID Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                Registration No *
              </label>
              <input
                type="text"
                required
                value={formData.registration_no}
                onChange={(e) => setFormData({ ...formData, registration_no: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                ID Type *
              </label>
              <select
                required
                value={formData.id_type}
                onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                }}
              >
                <option value="NRIC">NRIC</option>
                <option value="PASSPORT">Passport</option>
                <option value="BRN">BRN</option>
                <option value="ARMY">Army</option>
              </select>
            </div>
          </div>

          {/* Address Line 1 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
              Address Line 1 *
            </label>
            <input
              type="text"
              required
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#f1f5f9',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Address Line 2 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#f1f5f9',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* City and Postcode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                Postcode *
              </label>
              <input
                type="text"
                required
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                }}
              />
            </div>
          </div>

          {/* State */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
              State *
            </label>
            <select
              required
              value={formData.state_code}
              onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#f1f5f9',
                fontSize: '1rem',
              }}
            >
              <option value="">Select State</option>
              {MALAYSIAN_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
```

- [ ] **Step 8: Commit part 4**

```bash
git add frontend/src/pages/CustomerFormPage.tsx
git commit -m "feat: create customer form page (part 4 - registration and address fields)"
```

- [ ] **Step 9: Add action buttons (part 5)**

Continue adding inside the form, after the state field:

```typescript
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <motion.button
              type="submit"
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: '0.75rem',
                background: isSaving
                  ? 'rgba(139, 92, 246, 0.5)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none',
                color: 'white',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              whileHover={!isSaving ? { scale: 1.02 } : {}}
              whileTap={!isSaving ? { scale: 0.98 } : {}}
            >
              <Save style={{ width: '20px', height: '20px' }} />
              {isSaving ? 'Saving...' : id ? 'Update Customer' : 'Create Customer'}
            </motion.button>

            <motion.button
              type="button"
              onClick={() => navigate('/dashboard/customers')}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: '0.75rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              whileHover={!isSaving ? { scale: 1.02, background: 'rgba(239, 68, 68, 0.3)' } : {}}
              whileTap={!isSaving ? { scale: 0.98 } : {}}
            >
              <X style={{ width: '20px', height: '20px' }} />
              Cancel
            </motion.button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Commit part 5**

```bash
git add frontend/src/pages/CustomerFormPage.tsx
git commit -m "feat: create customer form page (part 5 - complete with action buttons)"
```

---

### Task 17: Manual Testing

**Files:**
- Test: All frontend and backend components

- [ ] **Step 1: Test email sending**

Manual test checklist:
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to an invoice detail page
4. Click "Send to Customer" button
5. Select "Email" as send method
6. Click "Send Invoice"
7. Verify: Email received with PDF attachment
8. Verify: Sending history shows "Email Sent" status

Expected: Email delivered successfully, history record created

- [ ] **Step 2: Test WhatsApp link generation**

Manual test checklist:
1. Navigate to an invoice detail page
2. Click "Send to Customer" button
3. Select "WhatsApp" as send method
4. Click "Send Invoice"
5. Verify: WhatsApp link displayed in modal
6. Click "Open WhatsApp" button
7. Verify: WhatsApp opens with pre-filled message
8. Verify: Message contains invoice number, amount, date

Expected: WhatsApp link works, message pre-filled correctly

- [ ] **Step 3: Test both methods**

Manual test checklist:
1. Navigate to an invoice detail page
2. Click "Send to Customer" button
3. Select "Both" as send method
4. Click "Send Invoice"
5. Verify: Email sent successfully
6. Verify: WhatsApp link displayed
7. Verify: Sending history shows both records

Expected: Both email and WhatsApp work together

- [ ] **Step 4: Test customer management**

Manual test checklist:
1. Navigate to Customers page
2. Click "Add Customer" button
3. Fill in all required fields
4. Click "Create Customer"
5. Verify: Customer appears in list
6. Click "Edit" button on customer
7. Modify customer information
8. Click "Update Customer"
9. Verify: Changes saved
10. Search for customer by name
11. Verify: Search works correctly

Expected: Full CRUD operations work

- [ ] **Step 5: Test error handling**

Manual test checklist:
1. Try sending email to customer without email address
2. Verify: Error message displayed
3. Try sending WhatsApp to customer without phone
4. Verify: Error message displayed
5. Try creating customer without required fields
6. Verify: Form validation works
7. Disconnect internet and try sending
8. Verify: Network error handled gracefully

Expected: All error cases handled properly

- [ ] **Step 6: Test sending history**

Manual test checklist:
1. Send same invoice multiple times via different methods
2. Verify: All sending records appear in history
3. Verify: Timestamps are correct
4. Verify: Status indicators are correct (sent/failed)
5. Click WhatsApp link from history
6. Verify: Link still works

Expected: Complete sending history tracked

---

## Implementation Complete

All tasks completed. The invoice sending system is now fully implemented with:

✅ **Backend:**
- InvoiceSending model with tenant isolation
- WhatsApp link generation service (FREE wa.me links)
- Email sending service (Nodemailer + Gmail SMTP)
- Invoice send endpoint (POST /api/v1/invoices/:id/send)
- Sending history endpoint (GET /api/v1/invoices/:id/sending-history)

✅ **Frontend:**
- SendInvoiceModal component (Email/WhatsApp/Both selection)
- SendingHistoryPanel component (display all sending records)
- WhatsAppLinkButton component (open wa.me links)
- Customer management pages (list, create, edit)
- Integration with InvoiceDetailPage

✅ **Testing:**
- Unit tests for all services (EmailService, WhatsAppService)
- Integration tests for API endpoints
- Manual testing checklist for end-to-end flows

✅ **Features:**
- Send invoices via Email with PDF attachment
- Generate WhatsApp links with pre-filled invoice information
- Track sending history with status (pending/sent/failed)
- Restore customer management UI
- Support custom email/WhatsApp messages
- Tenant isolation for multi-tenant security

**Next Steps:**
1. Configure SMTP credentials in `backend/.env`
2. Run manual tests to verify all functionality
3. Deploy to production
4. Monitor email delivery rates and error logs

**Phase 2 Enhancements (Future):**
- Recurring invoices (auto-send on schedule)
- Payment tracking and reminders
- Email open tracking (tracking pixels)
- Batch sending (multiple invoices at once)
- Email templates (customizable per tenant)
- SMS sending option (if needed)
