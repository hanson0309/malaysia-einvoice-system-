# Invoice Sending System Design

**Date:** 2026-05-17  
**Target Market:** Small micro enterprises (1-10 people), wholesalers and service companies doing B2B business  
**Goal:** Transform the system from a tax filing tool into a complete B2B invoice management system

## Executive Summary

This design adds invoice sending capabilities to the Malaysian e-invoice system, enabling businesses to send invoices to customers via Email and WhatsApp. The implementation uses free solutions (Gmail SMTP for email, wa.me links for WhatsApp) to keep costs low for small businesses.

**Key Features:**
- Send invoices via Email with PDF attachment
- Generate WhatsApp links with pre-filled invoice information
- Track sending history and status
- Restore Customer management UI
- Support for custom email/WhatsApp messages

**Implementation Timeline:** 2-3 weeks for Phase 1

---

## 1. Architecture Overview

### System Architecture

```
Frontend (React)
  ↓
Backend API (Express)
  ↓
├─ Invoice Management (existing)
├─ Customer Management (existing, restore UI)
└─ Invoice Sending System (NEW)
     ├─ Email Service (Nodemailer + Gmail SMTP)
     ├─ WhatsApp Link Generator
     └─ Sending History Tracker
```

### Technology Stack (New Components)

**Backend:**
- `nodemailer` - Email sending via Gmail SMTP or AWS SES free tier
- `pdf-lib` or existing PDF generation - Generate invoice PDF attachments
- New Model: `InvoiceSending` - Track sending history

**Frontend:**
- New pages: Customer management (restore existing routes)
- New component: `SendInvoiceModal` - Select Email/WhatsApp sending method
- New component: `SendingHistoryPanel` - Display sending history

### Core Flow

1. User clicks "Send to Customer" on Invoice Detail page
2. Modal opens: select sending method (Email / WhatsApp / Both)
3. Backend generates PDF + creates sending record
4. Email: send directly via Nodemailer
5. WhatsApp: return `wa.me` link to frontend, user clicks to open
6. Record sending history to `InvoiceSending` collection

---

## 2. Data Models

### New Model: InvoiceSending

Records every invoice sending attempt:

```typescript
interface IInvoiceSending {
  tenant_id: ObjectId;           // Multi-tenant isolation
  invoice_id: ObjectId;          // Related invoice
  customer_id: ObjectId;         // Related customer
  
  // Sending method
  send_method: 'email' | 'whatsapp' | 'both';
  
  // Email fields
  email_sent: boolean;           // Whether email was sent
  email_sent_at?: Date;          // Email send timestamp
  email_status: 'pending' | 'sent' | 'failed';
  email_error_message?: string;  // Failure reason
  email_to: string;              // Recipient email
  
  // WhatsApp fields
  whatsapp_link_generated: boolean;  // Whether link was generated
  whatsapp_link?: string;            // wa.me link
  whatsapp_phone: string;            // Recipient phone number
  
  // Metadata
  sent_by: ObjectId;             // Sender (User ID)
  pdf_url?: string;              // PDF file path (if stored)
  
  created_at: Date;
  updated_at: Date;
}
```

**Indexes:**
- `{ tenant_id: 1, invoice_id: 1 }` - Query sending history for an invoice
- `{ tenant_id: 1, customer_id: 1 }` - Query sending history for a customer
- `{ tenant_id: 1, created_at: -1 }` - Recent sending records

### Existing Model Changes

**Customer Model** - No changes needed, existing fields are sufficient:
- `email` - Used for email sending
- `phone` - Used for WhatsApp links

**Invoice Model** - No changes needed, maintain existing structure

---

## 3. Backend API Endpoints

### Customer Management (Restore Existing)

These routes already exist in `backend/src/routes/customers.ts`:

- `GET /api/v1/customers` - Customer list (search, pagination)
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers/:id` - Customer details
- `PUT /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer

### Invoice Sending (New)

**Main endpoint:**

```typescript
POST /api/v1/invoices/:id/send
Body: {
  send_method: 'email' | 'whatsapp' | 'both',
  email_subject?: string,      // Optional custom email subject
  email_message?: string,      // Optional custom email content
  whatsapp_message?: string    // Optional custom WhatsApp message
}

Response: {
  success: true,
  data: {
    sending_id: string,
    email_sent: boolean,
    whatsapp_link?: string     // If WhatsApp was selected
  }
}
```

**Sending history:**

```typescript
GET /api/v1/invoices/:id/sending-history
Response: {
  success: true,
  data: [
    {
      _id: string,
      send_method: string,
      email_status: string,
      whatsapp_link?: string,
      sent_by: { name: string, email: string },
      created_at: string
    }
  ]
}
```

### Sending History (New)

```typescript
GET /api/v1/sending-history
Query: {
  page?: number,
  limit?: number,
  customer_id?: string,
  send_method?: 'email' | 'whatsapp' | 'both'
}

Response: {
  success: true,
  data: [...],
  pagination: { total, page, limit }
}
```

---

## 4. Frontend Components

### Customer Management (Restore UI)

**Restore navigation:**
- Add "Customers" back to `DashboardLayout.tsx` navigation array
- Routes already exist: `/dashboard/customers`, `/dashboard/customers/new`, `/dashboard/customers/:id/edit`

**Pages:**
- `CustomersPage.tsx` - Customer list (search, filter B2B/B2C, pagination)
- `CustomerFormPage.tsx` - Create/edit customer form

### Invoice Sending (New Components)

**SendInvoiceModal.tsx** - Invoice sending modal:

```typescript
interface SendInvoiceModalProps {
  invoice: Invoice;
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Features:
// - Select sending method: Email / WhatsApp / Both
// - Preview invoice information
// - Email: custom subject and content (optional)
// - WhatsApp: custom message (optional)
// - Send button + loading state
// - Display WhatsApp link after success (if selected)
```

**SendingHistoryPanel.tsx** - Sending history panel:

```typescript
// Display in InvoiceDetailPage
// Features:
// - Show all sending records for this invoice
// - Each record shows: timestamp, method, status, sender
// - Email status: Sent / Failed (show error message)
// - WhatsApp: display link, can reopen
```

**WhatsAppLinkButton.tsx** - WhatsApp link button:

```typescript
// Display WhatsApp link button
// Click to open wa.me link in new window
// WhatsApp green styling + icon
```

### Modify Existing Pages

**InvoiceDetailPage.tsx** - Add sending functionality:

```typescript
// Add "Send to Customer" button at top
// Click to open SendInvoiceModal
// Add SendingHistoryPanel at bottom
```

**DashboardLayout.tsx** - Restore navigation:

```typescript
// Add back to navigation array:
{
  name: 'Customers',
  href: '/dashboard/customers',
  icon: Users
}
```

---

## 5. Email Sending System

### Technical Implementation

**Using Nodemailer + Gmail SMTP (free solution):**

```typescript
// backend/src/services/EmailService.ts

import nodemailer from 'nodemailer';

class EmailService {
  private transporter;
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,      // Gmail address
        pass: process.env.SMTP_PASSWORD   // Gmail App Password
      }
    });
  }
  
  async sendInvoice(params: {
    to: string,
    invoice: Invoice,
    customer: Customer,
    tenant: Tenant,
    pdfBuffer: Buffer,
    customSubject?: string,
    customMessage?: string
  }) {
    // Generate email HTML
    // Attach PDF
    // Send
  }
}
```

**Environment variables (.env):**
```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=MyInvois System
```

### Email Template Design

**Subject:**
```
Invoice #{{invoice_number}} from {{company_name}} - RM {{total_amount}}
```

**Content (HTML):**
- Company logo (optional)
- Greeting: Dear {{customer_name}}
- Invoice information: Invoice #, Issue Date, Due Date, Amount
- Payment information: Payment method, Bank details (if available)
- Attachment note: Please find the invoice attached as PDF
- Company contact information: Email, Phone
- Footer: Powered by MyInvois

**Attachment:**
- Filename: `Invoice-{{invoice_number}}.pdf`
- Use existing PDF generation (`GET /api/v1/invoices/:id/pdf`)

### Error Handling

- SMTP connection failure → record to `email_error_message`, status = `failed`
- Invalid recipient email → return error to frontend
- Send timeout (30 seconds) → mark as `failed`, allow manual retry

**No automatic retry** (Phase 1 keep it simple):
- User can manually retry from Sending History

---

## 6. WhatsApp Link Generation

### Technical Implementation

**WhatsApp API format:**
```
https://wa.me/{phone}?text={message}
```

**Implementation:**

```typescript
// backend/src/services/WhatsAppService.ts

class WhatsAppService {
  generateInvoiceLink(params: {
    phone: string,
    invoice: Invoice,
    customer: Customer,
    tenant: Tenant,
    customMessage?: string
  }): string {
    // 1. Format phone number
    const formattedPhone = this.formatPhone(params.phone);
    
    // 2. Generate message content
    const message = params.customMessage || this.getDefaultMessage(params);
    
    // 3. URL encode
    const encodedMessage = encodeURIComponent(message);
    
    // 4. Generate link
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }
  
  private formatPhone(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If Malaysian number (01x-xxx-xxxx)
    if (cleaned.startsWith('01')) {
      cleaned = '60' + cleaned;  // Add country code +60
    }
    
    // If already starts with 60, keep as is
    if (cleaned.startsWith('60')) {
      return cleaned;
    }
    
    // If other country code, keep as is
    return cleaned;
  }
  
  private getDefaultMessage(params): string {
    const { invoice, customer, tenant } = params;
    
    return `Hello ${customer.name},

Your invoice from ${tenant.company_name}:

📄 Invoice: ${invoice.invoice_number}
📅 Date: ${formatDate(invoice.issue_date)}
💰 Amount: RM ${invoice.total_amount.toFixed(2)}
⏰ Due: ${formatDate(invoice.due_date)}

Please check your email for the PDF invoice.

Thank you!
${tenant.company_name}
${tenant.phone}`;
  }
}
```

### Phone Number Format

**Supported formats:**
- `012-345-6789` → `60123456789`
- `+60123456789` → `60123456789`
- `60123456789` → `60123456789`

**Validation:**
- Frontend validates format on input
- Backend validates again before generating link

### Message Content

**Default template:**
```
Hello {{customer_name}},

Your invoice from {{company_name}}:

📄 Invoice: {{invoice_number}}
📅 Date: {{issue_date}}
💰 Amount: RM {{total_amount}}
⏰ Due: {{due_date}}

Please check your email for the PDF invoice.

Thank you!
{{company_name}}
{{company_phone}}
```

**User customization:**
- Provide text area in SendInvoiceModal
- Can modify message content
- Preserve key invoice information (number, amount, date)

---

## 7. Sending History & Tracking

### Recording Timing

**Create record:**
```typescript
// Create record immediately when user clicks "Send"
const sendingRecord = await InvoiceSending.create({
  tenant_id,
  invoice_id,
  customer_id,
  send_method,
  email_status: 'pending',
  email_sent: false,
  whatsapp_link_generated: false,
  sent_by: user_id
});

// Then execute sending operations
```

**Update record:**
```typescript
// Email sent successfully
await InvoiceSending.updateOne(
  { _id: sendingRecord._id },
  {
    email_sent: true,
    email_sent_at: new Date(),
    email_status: 'sent',
    email_to: customer.email
  }
);

// Email failed
await InvoiceSending.updateOne(
  { _id: sendingRecord._id },
  {
    email_status: 'failed',
    email_error_message: error.message
  }
);

// WhatsApp link generated
await InvoiceSending.updateOne(
  { _id: sendingRecord._id },
  {
    whatsapp_link_generated: true,
    whatsapp_link: link,
    whatsapp_phone: customer.phone
  }
);
```

### Tracking Features

**Email status tracking:**
- ✅ **Pending** - Sending in progress
- ✅ **Sent** - Successfully sent (Nodemailer confirmation)
- ✅ **Failed** - Send failed (show error message)

**WhatsApp tracking:**
- ✅ **Link Generated** - Link created
- ❌ **No click tracking** - wa.me links cannot track user clicks (Phase 1 skip)

### UI Display

**Display in InvoiceDetailPage:**

```typescript
// SendingHistoryPanel component
<div className="sending-history">
  <h3>Sending History</h3>
  
  {history.map(record => (
    <div className="history-item">
      {/* Timestamp */}
      <div>{formatDate(record.created_at)}</div>
      
      {/* Sending method */}
      <div>
        {record.send_method === 'both' ? 'Email + WhatsApp' : record.send_method}
      </div>
      
      {/* Email status */}
      {record.email_sent && (
        <Badge color="green">Email Sent</Badge>
      )}
      {record.email_status === 'failed' && (
        <Badge color="red" tooltip={record.email_error_message}>
          Email Failed
        </Badge>
      )}
      
      {/* WhatsApp link */}
      {record.whatsapp_link && (
        <WhatsAppLinkButton link={record.whatsapp_link} />
      )}
      
      {/* Sender */}
      <div>by {record.sent_by.name}</div>
      
      {/* Retry button (if failed) */}
      {record.email_status === 'failed' && (
        <Button onClick={() => retrySend(record._id)}>
          Retry
        </Button>
      )}
    </div>
  ))}
</div>
```

### Retry Functionality

**When email fails:**
- Show "Retry" button
- Click to call `POST /api/v1/invoices/:id/send` again
- Create new sending record (don't modify old record)

**WhatsApp links:**
- Links are permanent, can reopen anytime
- Show "Open WhatsApp" button in history

---

## 8. Error Handling

### Email Sending Errors

**1. SMTP connection failure**
```typescript
try {
  await transporter.sendMail(mailOptions);
} catch (error) {
  if (error.code === 'ECONNECTION') {
    throw new Error('Email server connection failed. Please check SMTP settings.');
  }
}
```
- Record to `email_error_message`
- Status = `failed`
- Frontend: ❌ "Email server unavailable. Please try again later."

**2. Invalid recipient email**
```typescript
if (!customer.email || !isValidEmail(customer.email)) {
  throw new Error('Customer email is invalid or missing');
}
```
- Frontend: ❌ "Customer email is invalid. Please update customer information."
- Provide "Edit Customer" link

**3. PDF generation failure**
```typescript
try {
  const pdfBuffer = await generateInvoicePDF(invoice);
} catch (error) {
  throw new Error('Failed to generate invoice PDF');
}
```
- Frontend: ❌ "Failed to generate PDF. Please try again."

**4. Send timeout (30 seconds)**
```typescript
const sendPromise = transporter.sendMail(mailOptions);
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Email sending timeout')), 30000)
);

await Promise.race([sendPromise, timeoutPromise]);
```
- Frontend: ❌ "Email sending timeout. Please try again."

### WhatsApp Link Generation Errors

**1. Invalid or missing phone number**
```typescript
if (!customer.phone) {
  throw new Error('Customer phone number is missing');
}

const formattedPhone = formatPhone(customer.phone);
if (!isValidPhone(formattedPhone)) {
  throw new Error('Customer phone number is invalid');
}
```
- Frontend: ❌ "Customer phone number is invalid. Please update customer information."
- Provide "Edit Customer" link

**2. Message too long**
```typescript
// WhatsApp links have length limit (~2000 characters)
if (encodedMessage.length > 2000) {
  // Auto-truncate message
  message = message.substring(0, 1500) + '...';
}
```

### General Error Handling

**1. Invoice not found**
```typescript
const invoice = await Invoice.findOne({ 
  _id: invoiceId, 
  tenant_id: req.user.tenant_id 
});

if (!invoice) {
  throw new NotFoundError('Invoice not found');
}
```
- Frontend: ❌ "Invoice not found"

**2. Customer not found**
```typescript
const customer = await Customer.findOne({ 
  _id: invoice.customer_id, 
  tenant_id: req.user.tenant_id 
});

if (!customer) {
  throw new NotFoundError('Customer not found');
}
```
- Frontend: ❌ "Customer information is missing"

**3. Permission issues (Tenant isolation)**
```typescript
// All queries must include tenant_id
// Use existing tenantIsolation middleware
```

### Frontend Error Display

**In SendInvoiceModal:**
```typescript
// Display error Alert
{error && (
  <Alert color="red">
    <AlertIcon />
    {error.message}
    {error.action && (
      <Button onClick={error.action}>
        {error.actionLabel}
      </Button>
    )}
  </Alert>
)}
```

**Retry mechanism:**
- Email failed → show "Retry" button
- WhatsApp link generation failed → show "Regenerate Link" button
- No automatic retry (Phase 1 keep it simple)

### Logging

**Record to database:**
- `InvoiceSending.email_error_message` - Email error info
- `InvoiceSending.email_status` - Status (failed)

**Record to server logs:**
```typescript
logger.error('Email sending failed', {
  tenant_id,
  invoice_id,
  customer_id,
  error: error.message,
  stack: error.stack
});
```

---

## 9. Testing Strategy

### Backend Unit Tests

**EmailService tests:**
```typescript
// backend/src/services/__tests__/EmailService.test.ts

describe('EmailService', () => {
  it('should send email with PDF attachment', async () => {
    // Mock nodemailer
    // Test successful send
  });
  
  it('should handle SMTP connection failure', async () => {
    // Mock SMTP connection failure
    // Verify error handling
  });
  
  it('should validate email address', async () => {
    // Test invalid email
  });
  
  it('should generate correct email content', async () => {
    // Verify HTML template
  });
});
```

**WhatsAppService tests:**
```typescript
// backend/src/services/__tests__/WhatsAppService.test.ts

describe('WhatsAppService', () => {
  it('should format Malaysian phone numbers correctly', () => {
    expect(formatPhone('012-345-6789')).toBe('60123456789');
    expect(formatPhone('+60123456789')).toBe('60123456789');
  });
  
  it('should generate valid WhatsApp link', () => {
    const link = generateInvoiceLink({...});
    expect(link).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
  });
  
  it('should encode message correctly', () => {
    // Test URL encoding
  });
  
  it('should handle invalid phone numbers', () => {
    // Test error handling
  });
});
```

**API endpoint integration tests:**
```typescript
// backend/src/routes/__tests__/invoices.test.ts

describe('POST /api/v1/invoices/:id/send', () => {
  it('should send invoice via email', async () => {
    // Test email sending
  });
  
  it('should generate WhatsApp link', async () => {
    // Test WhatsApp link generation
  });
  
  it('should create sending record', async () => {
    // Verify InvoiceSending record creation
  });
  
  it('should enforce tenant isolation', async () => {
    // Test cross-tenant access is denied
  });
});
```

### Frontend Component Tests

**SendInvoiceModal tests:**
```typescript
// frontend/src/components/__tests__/SendInvoiceModal.test.tsx

describe('SendInvoiceModal', () => {
  it('should render send options', () => {
    // Test Email/WhatsApp/Both options
  });
  
  it('should show WhatsApp link after sending', async () => {
    // Test WhatsApp link display
  });
  
  it('should display error messages', async () => {
    // Test error alerts
  });
});
```

### Manual Testing Checklist

**Email sending tests:**
- [ ] Send to valid email → receive email + PDF attachment
- [ ] Send to invalid email → show error
- [ ] SMTP misconfigured → show error
- [ ] Custom email subject and content → display correctly
- [ ] Send same invoice multiple times → create multiple history records

**WhatsApp link tests:**
- [ ] Generate link → click opens WhatsApp → message pre-filled correctly
- [ ] Malaysian number format (012-xxx-xxxx) → correctly convert to +60
- [ ] International number format (+60xxx) → handle correctly
- [ ] Invalid number → show error
- [ ] Custom message → display correctly

**Combined tests:**
- [ ] Select "Both" → email sent + WhatsApp link generated
- [ ] Email fails + WhatsApp succeeds → partial success message
- [ ] Retry failed email → create new record

**Permission tests:**
- [ ] Tenant A cannot send Tenant B's invoices
- [ ] Tenant A cannot view Tenant B's sending history

**UI/UX tests:**
- [ ] Loading state displays correctly
- [ ] Success message displays correctly
- [ ] Error messages are clear and helpful
- [ ] Sending history displays correctly
- [ ] Mobile responsive works properly

### Test Environment

**Email testing:**
- Development: Use Gmail SMTP (test account)
- Production: Use AWS SES or Gmail (official account)

**WhatsApp testing:**
- Use real phone numbers for testing
- Verify different number formats

---

## Implementation Phases

### Phase 1: Core Sending System (2-3 weeks)

**Week 1:**
- Restore Customer management UI
- Create InvoiceSending model
- Implement EmailService
- Implement WhatsAppService

**Week 2:**
- Create sending API endpoints
- Build SendInvoiceModal component
- Build SendingHistoryPanel component
- Integrate with InvoiceDetailPage

**Week 3:**
- Error handling and validation
- Testing (unit + integration + manual)
- Bug fixes and polish

### Phase 2: Future Enhancements (Post-launch)

- Recurring invoices (auto-send on schedule)
- Payment tracking and reminders
- Email open tracking (using tracking pixels)
- Batch sending (send multiple invoices at once)
- Email templates (customizable per tenant)
- SMS sending option (using Twilio)

---

## Success Metrics

**User adoption:**
- % of invoices sent via system (vs manual)
- Average sends per invoice
- Email vs WhatsApp usage ratio

**Technical metrics:**
- Email delivery success rate (target: >95%)
- Average send time (target: <5 seconds)
- Error rate (target: <5%)

**Business metrics:**
- User retention improvement
- Feature usage in free vs paid tiers
- Customer satisfaction (NPS)

---

## Risks and Mitigations

**Risk 1: Gmail SMTP rate limits**
- Mitigation: Gmail allows 500 emails/day for free accounts, 2000/day for Google Workspace
- If exceeded, switch to AWS SES (62,000 free emails/month)

**Risk 2: WhatsApp link not working on desktop**
- Mitigation: Detect device, show QR code on desktop for mobile scanning

**Risk 3: PDF generation performance**
- Mitigation: Generate PDF asynchronously if it takes >3 seconds
- Cache generated PDFs to avoid regeneration

**Risk 4: Email deliverability (spam filters)**
- Mitigation: Use proper SPF/DKIM/DMARC records
- Provide "Add to contacts" instructions
- Monitor bounce rates

---

## Conclusion

This design transforms the system from a tax filing tool into a complete B2B invoice management system by adding customer communication capabilities. The implementation uses free solutions (Gmail SMTP, WhatsApp links) to keep costs low while delivering high value to small businesses.

The phased approach allows for quick delivery (2-3 weeks) while maintaining quality and leaving room for future enhancements based on user feedback.
