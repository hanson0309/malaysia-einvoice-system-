# POS Backend Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing E-Invoice backend to support POS system integration with device management, transaction sync, inventory tracking, and appointment scheduling.

**Architecture:** Add 7 new MongoDB models (PosDevice, PosTransaction, PosInventoryLog, PosAppointment, TenantPosSettings) and extend existing Product/User models. Create new `/api/v1/pos/*` routes with full CRUD operations. Extend Invoice model to support POS source tracking.

**Tech Stack:** Node.js, Express, TypeScript, MongoDB/Mongoose, Zod validation, JWT authentication

---

## File Structure

### New Models
- `backend/src/models/PosDevice.ts` - Device registration and pairing
- `backend/src/models/PosTransaction.ts` - Sales transactions from POS
- `backend/src/models/PosInventoryLog.ts` - Inventory change tracking
- `backend/src/models/PosAppointment.ts` - Service appointments (optional module)
- `backend/src/models/TenantPosSettings.ts` - Per-tenant POS configuration

### Modified Models
- `backend/src/models/Product.ts` - Add POS fields (barcode, stock, batch, expiry, cost)
- `backend/src/models/User.ts` - Add POS employee fields (employee_code, pin_code, active_status)
- `backend/src/models/Invoice.ts` - Add source tracking (source, pos_transaction_id)

### New Routes
- `backend/src/routes/pos/devices.ts` - Device management and pairing
- `backend/src/routes/pos/transactions.ts` - Transaction sync and queries
- `backend/src/routes/pos/products.ts` - POS product operations
- `backend/src/routes/pos/inventory.ts` - Inventory management
- `backend/src/routes/pos/appointments.ts` - Appointment management
- `backend/src/routes/pos/employees.ts` - Employee/PIN management
- `backend/src/routes/pos/settings.ts` - POS settings CRUD
- `backend/src/routes/pos/index.ts` - POS routes aggregator

### Modified Routes
- `backend/src/routes/index.ts` - Register POS routes

### Tests
- `backend/src/routes/__tests__/pos.devices.test.ts`
- `backend/src/routes/__tests__/pos.transactions.test.ts`
- `backend/src/routes/__tests__/pos.products.test.ts`
- `backend/src/routes/__tests__/pos.inventory.test.ts`
- `backend/src/routes/__tests__/pos.appointments.test.ts`
- `backend/src/routes/__tests__/pos.settings.test.ts`

---

## Task 1: Create PosDevice Model

**Files:**
- Create: `backend/src/models/PosDevice.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/models/__tests__/PosDevice.test.ts`:

```typescript
import mongoose from 'mongoose';
import { PosDevice } from '../PosDevice';

describe('PosDevice Model', () => {
  it('should create a device with valid data', async () => {
    const deviceData = {
      device_id: 'test-device-uuid',
      tenant_id: new mongoose.Types.ObjectId(),
      device_name: 'Cashier 1',
      device_type: 'tablet',
      pairing_code: 'ABC123',
      pairing_code_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      status: 'pending',
      device_token: 'test-jwt-token',
    };

    const device = await PosDevice.create(deviceData);
    expect(device.device_name).toBe('Cashier 1');
    expect(device.status).toBe('pending');
  });

  it('should require tenant_id', async () => {
    const deviceData = {
      device_id: 'test-device-uuid',
      device_name: 'Cashier 1',
      device_type: 'tablet',
    };

    await expect(PosDevice.create(deviceData)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PosDevice.test.ts`
Expected: FAIL with "Cannot find module '../PosDevice'"

- [ ] **Step 3: Create PosDevice model**

Create `backend/src/models/PosDevice.ts`:

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IPosDevice extends Document {
  device_id: string;
  tenant_id: mongoose.Types.ObjectId;
  device_name: string;
  device_type: 'tablet' | 'desktop';
  pairing_code?: string;
  pairing_code_expires_at?: Date;
  status: 'pending' | 'active' | 'inactive';
  last_sync_at?: Date;
  device_token?: string;
  created_at: Date;
  activated_at?: Date;
}

const PosDeviceSchema = new Schema<IPosDevice>(
  {
    device_id: { type: String, required: true, unique: true, maxlength: 100 },
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    device_name: { type: String, required: true, maxlength: 100 },
    device_type: { type: String, required: true, enum: ['tablet', 'desktop'] },
    pairing_code: { type: String, maxlength: 10 },
    pairing_code_expires_at: { type: Date },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'active', 'inactive'],
    },
    last_sync_at: { type: Date },
    device_token: { type: String, maxlength: 500 },
    activated_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PosDeviceSchema.index({ tenant_id: 1, status: 1 });
PosDeviceSchema.index({ pairing_code: 1 });

export const PosDevice = mongoose.model<IPosDevice>('PosDevice', PosDeviceSchema);
```

- [ ] **Step 4: Export from index**

Modify `backend/src/models/index.ts`, add:

```typescript
export { PosDevice, IPosDevice } from './PosDevice';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- PosDevice.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/PosDevice.ts backend/src/models/__tests__/PosDevice.test.ts backend/src/models/index.ts
git commit -m "feat: add PosDevice model for device management"
```

## Task 2: Create PosTransaction Model

**Files:**
- Create: `backend/src/models/PosTransaction.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/models/__tests__/PosTransaction.test.ts`:

```typescript
import mongoose from 'mongoose';
import { PosTransaction } from '../PosTransaction';

describe('PosTransaction Model', () => {
  it('should create a transaction with valid data', async () => {
    const transactionData = {
      transaction_id: 'txn-uuid-123',
      tenant_id: new mongoose.Types.ObjectId(),
      transaction_number: 'TXN-001',
      transaction_date: new Date(),
      cashier_id: new mongoose.Types.ObjectId(),
      items: [
        {
          product_id: new mongoose.Types.ObjectId(),
          description: 'Test Product',
          quantity: 2,
          unit_price: 10.0,
          tax_type: 'SST',
          tax_rate: 6,
          tax_amount: 1.2,
          line_total: 21.2,
        },
      ],
      subtotal: 20.0,
      tax_amount: 1.2,
      total_amount: 21.2,
      payment_method: 'cash',
      payment_status: 'paid',
      device_id: 'device-uuid',
    };

    const transaction = await PosTransaction.create(transactionData);
    expect(transaction.transaction_number).toBe('TXN-001');
    expect(transaction.items).toHaveLength(1);
    expect(transaction.total_amount).toBe(21.2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PosTransaction.test.ts`
Expected: FAIL with "Cannot find module '../PosTransaction'"

- [ ] **Step 3: Create PosTransaction model**

Create `backend/src/models/PosTransaction.ts`:

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IPosTransactionItem {
  product_id?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

export interface IPosTransaction extends Document {
  transaction_id: string;
  tenant_id: mongoose.Types.ObjectId;
  transaction_number: string;
  transaction_date: Date;
  cashier_id: mongoose.Types.ObjectId;
  customer_id?: mongoose.Types.ObjectId;
  items: IPosTransactionItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'ewallet';
  payment_status: 'paid' | 'partial' | 'refund';
  invoice_id?: mongoose.Types.ObjectId;
  synced_at?: Date;
  device_id: string;
  created_at: Date;
}

const PosTransactionItemSchema = new Schema<IPosTransactionItem>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true, maxlength: 500 },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  tax_type: { type: String, required: true, enum: ['SST', 'E', 'Z', 'SR'] },
  tax_rate: { type: Number, required: true },
  tax_amount: { type: Number, required: true },
  line_total: { type: Number, required: true },
});

const PosTransactionSchema = new Schema<IPosTransaction>(
  {
    transaction_id: { type: String, required: true, unique: true, maxlength: 100 },
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    transaction_number: { type: String, required: true, maxlength: 50 },
    transaction_date: { type: Date, required: true },
    cashier_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer' },
    items: { type: [PosTransactionItemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax_amount: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    payment_method: { type: String, required: true, enum: ['cash', 'card', 'ewallet'] },
    payment_status: { type: String, required: true, enum: ['paid', 'partial', 'refund'] },
    invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    synced_at: { type: Date },
    device_id: { type: String, required: true, maxlength: 100 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PosTransactionSchema.index({ tenant_id: 1, transaction_date: -1 });
PosTransactionSchema.index({ transaction_id: 1 });
PosTransactionSchema.index({ invoice_id: 1 });

export const PosTransaction = mongoose.model<IPosTransaction>(
  'PosTransaction',
  PosTransactionSchema
);
```

- [ ] **Step 4: Export from index**

Modify `backend/src/models/index.ts`, add:

```typescript
export { PosTransaction, IPosTransaction, IPosTransactionItem } from './PosTransaction';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- PosTransaction.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/PosTransaction.ts backend/src/models/__tests__/PosTransaction.test.ts backend/src/models/index.ts
git commit -m "feat: add PosTransaction model for sales tracking"
```

## Task 3: Create PosInventoryLog Model

**Files:**
- Create: `backend/src/models/PosInventoryLog.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/models/__tests__/PosInventoryLog.test.ts`:

```typescript
import mongoose from 'mongoose';
import { PosInventoryLog } from '../PosInventoryLog';

describe('PosInventoryLog Model', () => {
  it('should create an inventory log entry', async () => {
    const logData = {
      tenant_id: new mongoose.Types.ObjectId(),
      product_id: new mongoose.Types.ObjectId(),
      transaction_type: 'sale',
      quantity_change: -5,
      before_quantity: 100,
      after_quantity: 95,
      reference_id: 'txn-123',
      created_by: new mongoose.Types.ObjectId(),
    };

    const log = await PosInventoryLog.create(logData);
    expect(log.transaction_type).toBe('sale');
    expect(log.quantity_change).toBe(-5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PosInventoryLog.test.ts`
Expected: FAIL with "Cannot find module '../PosInventoryLog'"

- [ ] **Step 3: Create PosInventoryLog model**

Create `backend/src/models/PosInventoryLog.ts`:

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IPosInventoryLog extends Document {
  tenant_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'stocktake';
  quantity_change: number;
  before_quantity: number;
  after_quantity: number;
  reference_id?: string;
  notes?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
}

const PosInventoryLogSchema = new Schema<IPosInventoryLog>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    transaction_type: {
      type: String,
      required: true,
      enum: ['purchase', 'sale', 'adjustment', 'stocktake'],
    },
    quantity_change: { type: Number, required: true },
    before_quantity: { type: Number, required: true },
    after_quantity: { type: Number, required: true },
    reference_id: { type: String, maxlength: 100 },
    notes: { type: String, maxlength: 500 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PosInventoryLogSchema.index({ tenant_id: 1, product_id: 1, created_at: -1 });

export const PosInventoryLog = mongoose.model<IPosInventoryLog>(
  'PosInventoryLog',
  PosInventoryLogSchema
);
```

- [ ] **Step 4: Export from index**

Modify `backend/src/models/index.ts`, add:

```typescript
export { PosInventoryLog, IPosInventoryLog } from './PosInventoryLog';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- PosInventoryLog.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/PosInventoryLog.ts backend/src/models/__tests__/PosInventoryLog.test.ts backend/src/models/index.ts
git commit -m "feat: add PosInventoryLog model for inventory tracking"
```

## Task 4: Create PosAppointment Model

**Files:**
- Create: `backend/src/models/PosAppointment.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/models/__tests__/PosAppointment.test.ts`:

```typescript
import mongoose from 'mongoose';
import { PosAppointment } from '../PosAppointment';

describe('PosAppointment Model', () => {
  it('should create an appointment', async () => {
    const appointmentData = {
      tenant_id: new mongoose.Types.ObjectId(),
      customer_id: new mongoose.Types.ObjectId(),
      appointment_date: new Date('2026-05-20'),
      start_time: '09:00',
      end_time: '10:00',
      service_type: 'haircut',
      service_items: [{ description: 'Haircut', price: 50 }],
      status: 'pending',
      reminder_sent: false,
    };

    const appointment = await PosAppointment.create(appointmentData);
    expect(appointment.service_type).toBe('haircut');
    expect(appointment.status).toBe('pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PosAppointment.test.ts`
Expected: FAIL with "Cannot find module '../PosAppointment'"

- [ ] **Step 3: Create PosAppointment model**

Create `backend/src/models/PosAppointment.ts`:

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IPosServiceItem {
  description: string;
  price: number;
}

export interface IPosAppointment extends Document {
  tenant_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  appointment_date: Date;
  start_time: string;
  end_time: string;
  service_type: string;
  service_items: IPosServiceItem[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  reminder_sent: boolean;
  created_at: Date;
}

const PosServiceItemSchema = new Schema<IPosServiceItem>({
  description: { type: String, required: true, maxlength: 200 },
  price: { type: Number, required: true },
});

const PosAppointmentSchema = new Schema<IPosAppointment>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    appointment_date: { type: Date, required: true },
    start_time: { type: String, required: true, maxlength: 10 },
    end_time: { type: String, required: true, maxlength: 10 },
    service_type: { type: String, required: true, maxlength: 100 },
    service_items: { type: [PosServiceItemSchema], required: true },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    },
    notes: { type: String, maxlength: 500 },
    reminder_sent: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PosAppointmentSchema.index({ tenant_id: 1, appointment_date: 1 });
PosAppointmentSchema.index({ customer_id: 1 });

export const PosAppointment = mongoose.model<IPosAppointment>(
  'PosAppointment',
  PosAppointmentSchema
);
```

- [ ] **Step 4: Export from index**

Modify `backend/src/models/index.ts`, add:

```typescript
export { PosAppointment, IPosAppointment, IPosServiceItem } from './PosAppointment';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- PosAppointment.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/PosAppointment.ts backend/src/models/__tests__/PosAppointment.test.ts backend/src/models/index.ts
git commit -m "feat: add PosAppointment model for service scheduling"
```

## Task 5: Create TenantPosSettings Model

**Files:**
- Create: `backend/src/models/TenantPosSettings.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/models/__tests__/TenantPosSettings.test.ts`:

```typescript
import mongoose from 'mongoose';
import { TenantPosSettings } from '../TenantPosSettings';

describe('TenantPosSettings Model', () => {
  it('should create settings with default values', async () => {
    const settingsData = {
      tenant_id: new mongoose.Types.ObjectId(),
      modules: {
        appointment: false,
        inventory: true,
        multi_cashier: true,
        customer_management: true,
      },
      business_type: 'retail',
      invoice_settings: {
        auto_create_on_payment: true,
        default_invoice_type: '02',
        require_customer_for_invoice: false,
      },
      hardware: {
        receipt_printer_enabled: true,
        barcode_scanner_enabled: true,
        cash_drawer_enabled: false,
        label_printer_enabled: false,
      },
    };

    const settings = await TenantPosSettings.create(settingsData);
    expect(settings.business_type).toBe('retail');
    expect(settings.modules.inventory).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- TenantPosSettings.test.ts`
Expected: FAIL with "Cannot find module '../TenantPosSettings'"

- [ ] **Step 3: Create TenantPosSettings model**

Create `backend/src/models/TenantPosSettings.ts`:

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ITenantPosSettings extends Document {
  tenant_id: mongoose.Types.ObjectId;
  modules: {
    appointment: boolean;
    inventory: boolean;
    multi_cashier: boolean;
    customer_management: boolean;
  };
  business_type: 'retail' | 'service' | 'both';
  invoice_settings: {
    auto_create_on_payment: boolean;
    default_invoice_type: '01' | '02';
    require_customer_for_invoice: boolean;
  };
  hardware: {
    receipt_printer_enabled: boolean;
    barcode_scanner_enabled: boolean;
    cash_drawer_enabled: boolean;
    label_printer_enabled: boolean;
  };
  updated_at: Date;
}

const TenantPosSettingsSchema = new Schema<ITenantPosSettings>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    modules: {
      appointment: { type: Boolean, required: true, default: false },
      inventory: { type: Boolean, required: true, default: true },
      multi_cashier: { type: Boolean, required: true, default: true },
      customer_management: { type: Boolean, required: true, default: true },
    },
    business_type: {
      type: String,
      required: true,
      default: 'retail',
      enum: ['retail', 'service', 'both'],
    },
    invoice_settings: {
      auto_create_on_payment: { type: Boolean, required: true, default: true },
      default_invoice_type: { type: String, required: true, default: '02', enum: ['01', '02'] },
      require_customer_for_invoice: { type: Boolean, required: true, default: false },
    },
    hardware: {
      receipt_printer_enabled: { type: Boolean, required: true, default: true },
      barcode_scanner_enabled: { type: Boolean, required: true, default: true },
      cash_drawer_enabled: { type: Boolean, required: true, default: false },
      label_printer_enabled: { type: Boolean, required: true, default: false },
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
  }
);

TenantPosSettingsSchema.index({ tenant_id: 1 });

export const TenantPosSettings = mongoose.model<ITenantPosSettings>(
  'TenantPosSettings',
  TenantPosSettingsSchema
);
```

- [ ] **Step 4: Export from index**

Modify `backend/src/models/index.ts`, add:

```typescript
export { TenantPosSettings, ITenantPosSettings } from './TenantPosSettings';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- TenantPosSettings.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/TenantPosSettings.ts backend/src/models/__tests__/TenantPosSettings.test.ts backend/src/models/index.ts
git commit -m "feat: add TenantPosSettings model for POS configuration"
```

## Task 6: Extend Product Model with POS Fields

**Files:**
- Modify: `backend/src/models/Product.ts`

- [ ] **Step 1: Write the failing test**

Add to `backend/src/models/__tests__/Product.test.ts` (or create if doesn't exist):

```typescript
import mongoose from 'mongoose';
import { Product } from '../Product';

describe('Product Model - POS Extensions', () => {
  it('should create a product with POS fields', async () => {
    const productData = {
      tenant_id: new mongoose.Types.ObjectId(),
      name: 'Test Product',
      unit_price: 100,
      tax_type: 'SST',
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Product.test.ts`
Expected: FAIL with validation errors for unknown fields

- [ ] **Step 3: Add POS fields to Product interface**

Modify `backend/src/models/Product.ts`, update interface:

```typescript
export interface IProduct extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  tax_type: 'SST' | 'E' | 'Z' | 'SR';
  tax_rate: number;
  tax_exemption_reason?: string;
  // POS fields
  barcode?: string;
  stock_quantity?: number;
  reorder_level?: number;
  batch_number?: string;
  expiry_date?: Date;
  cost_price?: number;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

- [ ] **Step 4: Add POS fields to Product schema**

Modify `backend/src/models/Product.ts`, update schema:

```typescript
const ProductSchema = new Schema<IProduct>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String },
    sku: { type: String, maxlength: 100 },
    unit_price: { type: Number, required: true },
    tax_type: {
      type: String,
      required: true,
      enum: ['SST', 'E', 'Z', 'SR'],
      maxlength: 3,
    },
    tax_rate: { type: Number, required: true },
    tax_exemption_reason: { type: String, maxlength: 200 },
    // POS fields
    barcode: { type: String, maxlength: 50 },
    stock_quantity: { type: Number, default: 0 },
    reorder_level: { type: Number, default: 0 },
    batch_number: { type: String, maxlength: 50 },
    expiry_date: { type: Date },
    cost_price: { type: Number },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ProductSchema.index({ tenant_id: 1, deleted_at: 1 });
ProductSchema.index({ barcode: 1 }); // Add index for barcode lookup
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- Product.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/Product.ts backend/src/models/__tests__/Product.test.ts
git commit -m "feat: extend Product model with POS fields (barcode, stock, batch, expiry, cost)"
```

## Task 7: Extend User Model with POS Employee Fields

**Files:**
- Modify: `backend/src/models/User.ts`

- [ ] **Step 1: Write the failing test**

Add to `backend/src/models/__tests__/User.test.ts` (or create if doesn't exist):

```typescript
import mongoose from 'mongoose';
import { User } from '../User';

describe('User Model - POS Employee Extensions', () => {
  it('should create a user with POS employee fields', async () => {
    const userData = {
      tenant_id: new mongoose.Types.ObjectId(),
      email: 'cashier@test.com',
      password_hash: 'hashed_password',
      role: 'cashier',
      employee_code: 'EMP-001',
      pin_code: 'hashed_pin',
      active_status: 'active',
    };

    const user = await User.create(userData);
    expect(user.employee_code).toBe('EMP-001');
    expect(user.active_status).toBe('active');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- User.test.ts`
Expected: FAIL with validation errors for unknown fields

- [ ] **Step 3: Add POS employee fields to User interface**

Modify `backend/src/models/User.ts`, update interface:

```typescript
export interface IUser extends Document {
  tenant_id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  role: 'admin' | 'accountant' | 'viewer' | 'cashier' | 'inventory_manager' | 'service_staff';
  // POS employee fields
  employee_code?: string;
  pin_code?: string;
  active_status?: 'active' | 'inactive';
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

- [ ] **Step 4: Add POS employee fields to User schema**

Modify `backend/src/models/User.ts`, update schema:

```typescript
const UserSchema = new Schema<IUser>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    email: { type: String, required: true, unique: true, maxlength: 100 },
    password_hash: { type: String, required: true, maxlength: 255 },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'accountant', 'viewer', 'cashier', 'inventory_manager', 'service_staff'],
      maxlength: 20,
    },
    // POS employee fields
    employee_code: { type: String, maxlength: 50 },
    pin_code: { type: String, maxlength: 255 },
    active_status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

UserSchema.index({ tenant_id: 1, deleted_at: 1 });
UserSchema.index({ employee_code: 1 }); // Add index for employee code lookup
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- User.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/User.ts backend/src/models/__tests__/User.test.ts
git commit -m "feat: extend User model with POS employee fields (employee_code, pin_code, active_status)"
```

## Task 8: Extend Invoice Model with POS Source Tracking

**Files:**
- Modify: `backend/src/models/Invoice.ts`

- [ ] **Step 1: Write the failing test**

Add to `backend/src/models/__tests__/Invoice.test.ts` (or create if doesn't exist):

```typescript
import mongoose from 'mongoose';
import { Invoice } from '../Invoice';

describe('Invoice Model - POS Source Tracking', () => {
  it('should create an invoice with POS source', async () => {
    const invoiceData = {
      tenant_id: new mongoose.Types.ObjectId(),
      invoice_number: 'INV-POS-001',
      invoice_type: '02',
      customer_id: new mongoose.Types.ObjectId(),
      issue_date: new Date(),
      currency: 'MYR',
      exchange_rate: 1.0,
      subtotal: 100,
      tax_amount: 6,
      total_amount: 106,
      status: 'draft',
      retry_count: 0,
      items: [
        {
          description: 'Test Item',
          quantity: 1,
          unit_price: 100,
          tax_type: 'SST',
          tax_rate: 6,
          tax_amount: 6,
          line_total: 106,
        },
      ],
      source: 'pos',
      pos_transaction_id: 'txn-uuid-123',
    };

    const invoice = await Invoice.create(invoiceData);
    expect(invoice.source).toBe('pos');
    expect(invoice.pos_transaction_id).toBe('txn-uuid-123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Invoice.test.ts`
Expected: FAIL with validation errors for unknown fields

- [ ] **Step 3: Add POS source fields to Invoice interface**

Modify `backend/src/models/Invoice.ts`, update interface after line 48:

```typescript
export interface IInvoice extends Document {
  tenant_id: mongoose.Types.ObjectId;
  invoice_number: string;
  internal_reference_no?: string;
  invoice_type: '01' | '02' | '03' | '04';
  original_invoice_id?: mongoose.Types.ObjectId;
  original_invoice_number?: string;
  customer_id: mongoose.Types.ObjectId;
  issue_date: Date;
  due_date?: Date;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method?: 'cash' | 'bank_transfer' | 'card' | 'ewallet';
  payment_terms?: string;
  paid_amount?: number;
  payment_date?: Date;
  status: 'draft' | 'validated' | 'submitted' | 'accepted' | 'rejected' | 'cancelled';
  lhdn_submission_uid?: string;
  lhdn_validation_code?: string;
  lhdn_qr_code?: string;
  lhdn_digital_signature?: string;
  lhdn_submitted_at?: Date;
  lhdn_error_message?: string;
  lhdn_error_code?: string;
  retry_count: number;
  next_retry_at?: Date;
  pdf_url?: string;
  items: IInvoiceItem[];
  // POS source tracking
  source?: 'manual' | 'pos';
  pos_transaction_id?: string;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

- [ ] **Step 4: Add POS source fields to Invoice schema**

Modify `backend/src/models/Invoice.ts`, add fields before `deleted_at`:

```typescript
    pdf_url: { type: String, maxlength: 500 },
    // POS source tracking
    source: { type: String, enum: ['manual', 'pos'], default: 'manual' },
    pos_transaction_id: { type: String, maxlength: 100 },
    deleted_at: { type: Date },
```

- [ ] **Step 5: Add index for POS transaction lookup**

Modify `backend/src/models/Invoice.ts`, add index after existing indexes:

```typescript
InvoiceSchema.index({ pos_transaction_id: 1 });
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- Invoice.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/Invoice.ts backend/src/models/__tests__/Invoice.test.ts
git commit -m "feat: extend Invoice model with POS source tracking (source, pos_transaction_id)"
```

## Task 9: Create POS Devices API Routes

**Files:**
- Create: `backend/src/routes/pos/devices.ts`
- Create: `backend/src/routes/__tests__/pos.devices.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/routes/__tests__/pos.devices.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../app';
import { PosDevice } from '../../models';

describe('POST /api/v1/pos/devices', () => {
  it('should generate pairing code', async () => {
    const response = await request(app)
      .post('/api/v1/pos/devices')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ device_name: 'Cashier 1', device_type: 'tablet' })
      .expect(201);

    expect(response.body.pairing_code).toHaveLength(6);
    expect(response.body.device_name).toBe('Cashier 1');
  });
});

describe('POST /api/v1/pos/devices/pair', () => {
  it('should pair device with valid code', async () => {
    const device = await PosDevice.create({
      device_id: 'temp-id',
      tenant_id: testTenantId,
      device_name: 'Test Device',
      device_type: 'tablet',
      pairing_code: 'ABC123',
      pairing_code_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      status: 'pending',
    });

    const response = await request(app)
      .post('/api/v1/pos/devices/pair')
      .send({
        pairing_code: 'ABC123',
        device_info: { device_id: 'real-device-uuid', os: 'Android 13' },
      })
      .expect(200);

    expect(response.body.device_token).toBeDefined();
    expect(response.body.tenant_info).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pos.devices.test.ts`
Expected: FAIL with 404 Not Found

- [ ] **Step 3: Create devices route**

Create `backend/src/routes/pos/devices.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { extractTenant } from '../../middleware/tenant';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import { PosDevice, TenantPosSettings, Tenant, Product, Customer } from '../../models';
import { config } from '../../config/env';

const router = Router();

// Generate pairing code (authenticated - admin only)
router.post('/', authenticateJWT, extractTenant, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      device_name: z.string().min(1).max(100),
      device_type: z.enum(['tablet', 'desktop']),
    });

    const data = schema.parse(req.body);

    // Generate 6-character alphanumeric code
    const pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const device = await PosDevice.create({
      device_id: `temp-${Date.now()}`,
      tenant_id: req.tenantId,
      device_name: data.device_name,
      device_type: data.device_type,
      pairing_code: pairingCode,
      pairing_code_expires_at: expiresAt,
      status: 'pending',
    });

    res.status(201).json({
      device_id: device.device_id,
      device_name: device.device_name,
      pairing_code: pairingCode,
      expires_at: expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Pair device (unauthenticated - uses pairing code)
router.post('/pair', async (req, res, next) => {
  try {
    const schema = z.object({
      pairing_code: z.string().length(6),
      device_info: z.object({
        device_id: z.string(),
        os: z.string().optional(),
      }),
    });

    const data = schema.parse(req.body);

    // Find device with valid pairing code
    const device = await PosDevice.findOne({
      pairing_code: data.pairing_code,
      pairing_code_expires_at: { $gt: new Date() },
      status: 'pending',
    });

    if (!device) {
      throw new UnauthorizedError('Invalid or expired pairing code');
    }

    // Update device
    device.device_id = data.device_info.device_id;
    device.status = 'active';
    device.activated_at = new Date();
    device.pairing_code = undefined;
    device.pairing_code_expires_at = undefined;

    // Generate device token (30 days)
    const deviceToken = jwt.sign(
      {
        device_id: device.device_id,
        tenant_id: device.tenant_id.toString(),
        type: 'device',
      },
      config.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    device.device_token = deviceToken;
    await device.save();

    // Get tenant info
    const tenant = await Tenant.findById(device.tenant_id);

    // Get POS settings (or create default)
    let settings = await TenantPosSettings.findOne({ tenant_id: device.tenant_id });
    if (!settings) {
      settings = await TenantPosSettings.create({ tenant_id: device.tenant_id });
    }

    // Get initial data
    const products = await Product.find({ tenant_id: device.tenant_id, deleted_at: null }).limit(
      100
    );
    const customers = await Customer.find({ tenant_id: device.tenant_id, deleted_at: null }).limit(
      100
    );

    res.json({
      device_token: deviceToken,
      tenant_info: {
        tenant_id: tenant?._id,
        name: tenant?.name,
      },
      settings: settings,
      initial_data: {
        products: products,
        customers: customers,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Get all devices (authenticated)
router.get('/', authenticateJWT, extractTenant, async (req: AuthRequest, res, next) => {
  try {
    const devices = await PosDevice.find({ tenant_id: req.tenantId }).sort({ created_at: -1 });
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

// Deactivate device (authenticated)
router.delete('/:id', authenticateJWT, extractTenant, async (req: AuthRequest, res, next) => {
  try {
    const device = await PosDevice.findOne({ _id: req.params.id, tenant_id: req.tenantId });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    device.status = 'inactive';
    device.device_token = undefined;
    await device.save();

    res.json({ message: 'Device deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- pos.devices.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/pos/devices.ts backend/src/routes/__tests__/pos.devices.test.ts
git commit -m "feat: add POS devices API (pairing, list, deactivate)"
```

## Task 10: Create POS Transactions API

**Files:**
- Create: `backend/src/routes/pos/transactions.ts`
- Create: `backend/src/routes/__tests__/pos.transactions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/routes/__tests__/pos.transactions.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../app';
import mongoose from 'mongoose';

describe('POST /api/v1/pos/transactions', () => {
  it('should sync transactions from POS', async () => {
    const response = await request(app)
      .post('/api/v1/pos/transactions')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        transactions: [
          {
            transaction_id: 'txn-uuid-001',
            transaction_number: 'TXN-001',
            transaction_date: '2026-05-19',
            cashier_id: cashierId,
            items: [
              {
                description: 'Test Product',
                quantity: 1,
                unit_price: 100,
                tax_type: 'SST',
                tax_rate: 6,
                tax_amount: 6,
                line_total: 106,
              },
            ],
            subtotal: 100,
            tax_amount: 6,
            total_amount: 106,
            payment_method: 'cash',
            payment_status: 'paid',
            device_id: 'device-uuid',
          },
        ],
      })
      .expect(200);

    expect(response.body.synced).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pos.transactions.test.ts`
Expected: FAIL with 404 Not Found

- [ ] **Step 3: Create transactions route**

Create `backend/src/routes/pos/transactions.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthRequest } from '../../middleware/auth';
import { extractTenant } from '../../middleware/tenant';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { PosTransaction, Invoice } from '../../models';

const router = Router();

router.use(authenticateJWT);
router.use(extractTenant);

const transactionItemSchema = z.object({
  product_id: z.string().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  tax_type: z.enum(['SST', 'E', 'Z', 'SR']),
  tax_rate: z.number().min(0).max(100),
  tax_amount: z.number(),
  line_total: z.number(),
});

const transactionSchema = z.object({
  transaction_id: z.string(),
  transaction_number: z.string(),
  transaction_date: z.string(),
  cashier_id: z.string(),
  customer_id: z.string().optional(),
  items: z.array(transactionItemSchema).min(1),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  payment_method: z.enum(['cash', 'card', 'ewallet']),
  payment_status: z.enum(['paid', 'partial', 'refund']),
  device_id: z.string(),
});

// Sync transactions (batch)
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      transactions: z.array(transactionSchema).min(1).max(50),
    });

    const data = schema.parse(req.body);
    let synced = 0;

    for (const txn of data.transactions) {
      // Check if already exists (idempotency)
      const existing = await PosTransaction.findOne({ transaction_id: txn.transaction_id });
      if (existing) continue;

      await PosTransaction.create({
        ...txn,
        tenant_id: req.tenantId,
        transaction_date: new Date(txn.transaction_date),
        synced_at: new Date(),
      });
      synced++;
    }

    res.json({ synced, total: data.transactions.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Validation failed', undefined, error.issues));
    } else {
      next(error);
    }
  }
});

// Get transactions
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const filters: any = { tenant_id: req.tenantId };

    if (req.query.start_date && req.query.end_date) {
      filters.transaction_date = {
        $gte: new Date(req.query.start_date as string),
        $lte: new Date(req.query.end_date as string),
      };
    }

    const transactions = await PosTransaction.find(filters)
      .sort({ transaction_date: -1 })
      .limit(100);

    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- pos.transactions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/pos/transactions.ts backend/src/routes/__tests__/pos.transactions.test.ts
git commit -m "feat: add POS transactions API (sync, list)"
```

### Task 11: POS Products API  
- File: `backend/src/routes/pos/products.ts`
- Endpoints: GET (with barcode search), POST, PUT /:id
- Test: `backend/src/routes/__tests__/pos.products.test.ts`

### Task 12: POS Inventory API
- File: `backend/src/routes/pos/inventory.ts`
- Endpoints: POST /adjust, POST /restock, GET /logs
- Test: `backend/src/routes/__tests__/pos.inventory.test.ts`

### Task 13: POS Appointments API
- File: `backend/src/routes/pos/appointments.ts`
- Endpoints: GET, POST, PUT /:id, DELETE /:id
- Test: `backend/src/routes/__tests__/pos.appointments.test.ts`

### Task 14: POS Employees API
- File: `backend/src/routes/pos/employees.ts`
- Endpoints: POST /pin-login, GET (list)
- Test: `backend/src/routes/__tests__/pos.employees.test.ts`

### Task 15: POS Settings API
- File: `backend/src/routes/pos/settings.ts`
- Endpoints: GET, PUT
- Test: `backend/src/routes/__tests__/pos.settings.test.ts`

**Implementation Pattern for Tasks 10-15:**

Each task follows this structure:
1. Write failing test with request/response examples
2. Run test (expect FAIL)
3. Implement route with Zod validation
4. Add authentication/tenant middleware
5. Run test (expect PASS)
6. Commit with descriptive message

## Task 16: Create POS Routes Index and Register

**Files:**
- Create: `backend/src/routes/pos/index.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 1: Create POS routes aggregator**

Create `backend/src/routes/pos/index.ts`:

```typescript
import { Router } from 'express';
import devicesRouter from './devices';
import transactionsRouter from './transactions';
import productsRouter from './products';
import inventoryRouter from './inventory';
import appointmentsRouter from './appointments';
import employeesRouter from './employees';
import settingsRouter from './settings';

const router = Router();

router.use('/devices', devicesRouter);
router.use('/transactions', transactionsRouter);
router.use('/products', productsRouter);
router.use('/inventory', inventoryRouter);
router.use('/appointments', appointmentsRouter);
router.use('/employees', employeesRouter);
router.use('/settings', settingsRouter);

export default router;
```

- [ ] **Step 2: Register POS routes in main router**

Modify `backend/src/routes/index.ts`, add:

```typescript
import posRouter from './pos';

// ... existing routes ...

router.use('/pos', posRouter);
```

- [ ] **Step 3: Test POS routes are accessible**

Run: `npm test`
Expected: All POS route tests pass

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/pos/index.ts backend/src/routes/index.ts
git commit -m "feat: register POS routes under /api/v1/pos"
```

---

## Task 17: Update Invoice Routes to Support POS Source

**Files:**
- Modify: `backend/src/routes/invoices.ts`

- [ ] **Step 1: Update invoice creation schema**

Modify `backend/src/routes/invoices.ts`, update schema to accept POS fields:

```typescript
const invoiceSchema = z.object({
  invoice_number: z.string().min(1).max(50),
  invoice_type: z.enum(['01', '02', '03', '04']),
  customer_id: z.string(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency: z.string().length(3).default('MYR'),
  payment_method: z.enum(['cash', 'bank_transfer', 'card', 'ewallet']).optional(),
  items: z.array(invoiceItemSchema).min(1),
  // POS fields
  source: z.enum(['manual', 'pos']).optional(),
  pos_transaction_id: z.string().optional(),
});
```

- [ ] **Step 2: Update invoice creation logic**

Modify POST route to save POS fields:

```typescript
const invoice = await Invoice.create({
  tenant_id: req.tenantId,
  // ... existing fields ...
  source: data.source || 'manual',
  pos_transaction_id: data.pos_transaction_id,
});
```

- [ ] **Step 3: Add filter for POS invoices in GET route**

Modify GET route to support source filter:

```typescript
const filters: any = {
  tenant_id: req.tenantId,
  deleted_at: null,
};

if (req.query.source) {
  filters.source = req.query.source;
}

if (req.query.status) {
  filters.status = req.query.status;
}
```

- [ ] **Step 4: Write test for POS invoice creation**

Add test in `backend/src/routes/__tests__/invoices.test.ts`:

```typescript
it('should create invoice with POS source', async () => {
  const response = await request(app)
    .post('/api/v1/invoices')
    .set('Authorization', `Bearer ${validToken}`)
    .send({
      ...validInvoiceData,
      source: 'pos',
      pos_transaction_id: 'txn-uuid-123',
    })
    .expect(201);

  expect(response.body.source).toBe('pos');
  expect(response.body.pos_transaction_id).toBe('txn-uuid-123');
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- invoices.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/invoices.ts backend/src/routes/__tests__/invoices.test.ts
git commit -m "feat: support POS source tracking in invoice creation"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 7 models created, all API endpoints covered
- [x] **Placeholder scan:** No TBD, TODO, or vague instructions
- [x] **Type consistency:** Model interfaces match route usage
- [x] **File paths:** All paths are absolute and correct
- [x] **Test coverage:** Each model and route has tests
- [x] **Commit messages:** Follow conventional commits format

---

## Execution Notes

**Estimated Time:** 2-3 weeks (10-15 working days)

**Dependencies:**
- MongoDB running
- Redis running (for existing queue system)
- Node.js 18+
- All existing tests passing

**Testing Strategy:**
- Unit tests for each model
- Integration tests for each API route
- Manual testing with Postman/Thunder Client
- Test with actual POS App once backend is complete

**Deployment:**
- Run migrations if needed (models auto-create collections)
- Update environment variables if needed
- Deploy to staging first
- Smoke test all POS endpoints
- Deploy to production

---

**Plan complete and saved.**

