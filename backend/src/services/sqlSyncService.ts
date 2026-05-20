import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import { TenantSqlConnection, ISqlColumnMapping } from '../models/TenantSqlConnection';
import { Invoice, Customer } from '../models';
import { encryption } from './encryption';
import { logger } from '../utils/logger';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function col(row: Record<string, any>, colName: string | undefined): any {
  if (!colName) return undefined;
  return row[colName];
}

function mapInvoiceType(v: any): '01' | '02' | '03' | '04' {
  if (['01', '02', '03', '04'].includes(String(v))) return String(v) as any;
  return '01';
}

function mapTaxType(v: any): 'SST' | 'E' | 'Z' | 'SR' {
  if (['SST', 'E', 'Z', 'SR'].includes(String(v))) return String(v) as any;
  return 'E';
}

function mapPaymentMethod(v: any): 'cash' | 'bank_transfer' | 'card' | 'ewallet' | undefined {
  if (['cash', 'bank_transfer', 'card', 'ewallet'].includes(String(v))) return String(v) as any;
  return undefined;
}

function mapIdType(v: any): 'NRIC' | 'PASSPORT' | 'BRN' | 'ARMY' {
  if (['NRIC', 'PASSPORT', 'BRN', 'ARMY'].includes(String(v))) return String(v) as any;
  return 'BRN';
}

function mapCustomerType(v: any): 'B2B' | 'B2C' {
  if (['B2B', 'B2C'].includes(String(v))) return String(v) as any;
  return 'B2B';
}

function toFloat(v: any, fallback = 0): number {
  const n = parseFloat(String(v ?? ''));
  return isNaN(n) ? fallback : n;
}

function toStr(v: any): string {
  return String(v ?? '').trim();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SqlSyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string;
}

// ─── Core sync for one tenant ─────────────────────────────────────────────────

export async function syncTenantSqlInvoices(tenantId: string, fullSync = false): Promise<SqlSyncResult> {
  const cfg = await TenantSqlConnection.findOne({
    tenant_id: new mongoose.Types.ObjectId(tenantId),
    is_active: true,
  });

  if (!cfg) {
    return { imported: 0, updated: 0, skipped: 0, errors: 0, message: 'No active SQL connection configured' };
  }

  let password: string;
  try {
    password = encryption.decrypt(cfg.password_encrypted);
  } catch {
    return { imported: 0, updated: 0, skipped: 0, errors: 1, message: 'Failed to decrypt SQL password' };
  }

  let conn: mysql.Connection | null = null;
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.username,
      password,
      connectTimeout: 15000,
    });

    const mapping = cfg.column_mapping;
    const lastSync = fullSync ? null : cfg.last_sync_at;
    // Pass DATE-only string so MySQL DATE column comparisons work correctly.
    // A full datetime param (e.g. 14:00:00) would exclude same-day rows whose
    // inv_date is treated as 00:00:00 by MySQL when compared against DATETIME.
    const toDateStr = (d: Date) => d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const queryParams: any[] = cfg.invoice_query.includes('?')
      ? [lastSync ? toDateStr(lastSync) : '1970-01-01']
      : [];
    const [rows] = await conn.query(cfg.invoice_query, queryParams) as any[];
    const invoiceRows: Record<string, any>[] = Array.isArray(rows) ? rows : [];

    for (const row of invoiceRows) {
      try {
        const invoiceNumber = toStr(col(row, mapping.invoice.invoice_number));
        if (!invoiceNumber) { errors++; continue; }

        const existingInvoice = await Invoice.findOne({
          tenant_id: new mongoose.Types.ObjectId(tenantId),
          invoice_number: invoiceNumber,
        });
        if (existingInvoice) {
          // Always protect invoices already submitted/accepted — never overwrite IRB state
          if (['submitted', 'accepted', 'validated'].includes(existingInvoice.status)) {
            skipped++; continue;
          }
          // Full sync: always fall through to update.
          // Incremental sync: only update if key fields actually changed in SQL.
          if (!fullSync) {
            const totalRawCheck = toFloat(col(row, mapping.invoice.total_amount));
            const descCheck = toStr(col(row, mapping.lines.description)) || `Invoice ${invoiceNumber}`;
            const qtyCheck = toFloat(col(row, mapping.lines.quantity), 1);
            const existingDesc = existingInvoice.items[0]?.description ?? '';
            const existingQty = existingInvoice.items[0]?.quantity ?? 1;
            const unchanged =
              Math.abs(existingInvoice.total_amount - totalRawCheck) < 0.001 &&
              existingDesc === descCheck &&
              Math.abs(existingQty - qtyCheck) < 0.001;
            if (unchanged) { skipped++; continue; }
          }
        }

        // ── Upsert customer ──────────────────────────────────────────────────
        const custName = toStr(col(row, mapping.customer.name));
        const custRegNo = toStr(col(row, mapping.customer.registration_no));
        if (!custName || !custRegNo) { errors++; continue; }

        let customer = await Customer.findOne({
          tenant_id: new mongoose.Types.ObjectId(tenantId),
          registration_no: custRegNo,
          deleted_at: null,
        });

        if (!customer) {
          customer = await Customer.create({
            tenant_id: new mongoose.Types.ObjectId(tenantId),
            name: custName,
            registration_no: custRegNo,
            id_type: mapIdType(col(row, mapping.customer.id_type)),
            customer_type: mapCustomerType(col(row, mapping.customer.customer_type)),
            country_code: toStr(col(row, mapping.customer.country_code)).substring(0, 2) || 'MY',
            email: toStr(col(row, mapping.customer.email)) || undefined,
            phone: toStr(col(row, mapping.customer.phone)) || undefined,
            tin_number: toStr(col(row, mapping.customer.tin_number)) || undefined,
            address_line1: toStr(col(row, mapping.customer.address_line1)) || undefined,
            city: toStr(col(row, mapping.customer.city)) || undefined,
            postcode: toStr(col(row, mapping.customer.postcode)) || undefined,
            state_code: toStr(col(row, mapping.customer.state_code)).substring(0, 2) || undefined,
          });
        }

        // ── Line items ───────────────────────────────────────────────────────
        let lineItems: any[] = [];

        if (cfg.invoice_lines_query && mapping.invoice.id_column) {
          const invoiceId = col(row, mapping.invoice.id_column);
          const [lineRows] = await conn.query(cfg.invoice_lines_query, [invoiceId]) as any[];
          const linesData: Record<string, any>[] = Array.isArray(lineRows) ? lineRows : [];

          for (const line of linesData) {
            const desc = toStr(col(line, mapping.lines.description));
            const qty = toFloat(col(line, mapping.lines.quantity), 1);
            const price = toFloat(col(line, mapping.lines.unit_price));
            if (!desc) continue;

            const taxRate = toFloat(col(line, mapping.lines.tax_rate), 0);
            const lineTotal = toFloat(col(line, mapping.lines.line_total), qty * price);
            const taxAmount = toFloat(col(line, mapping.lines.tax_amount), lineTotal * taxRate / 100);

            lineItems.push({
              description: desc,
              quantity: qty,
              unit_price: price,
              tax_type: mapTaxType(col(line, mapping.lines.tax_type)),
              tax_rate: taxRate,
              tax_amount: taxAmount,
              line_total: lineTotal,
            });
          }
        } else {
          // Single-line derived from invoice header row
          const desc = toStr(col(row, mapping.lines.description)) || `Invoice ${invoiceNumber}`;
          const totalRaw = toFloat(col(row, mapping.invoice.total_amount));
          const taxAmt = toFloat(col(row, mapping.invoice.tax_amount));
          const sub = toFloat(col(row, mapping.invoice.subtotal), totalRaw - taxAmt);
          const taxRate = toFloat(col(row, mapping.lines.tax_rate), 0);

          lineItems.push({
            description: desc,
            quantity: 1,
            unit_price: sub,
            tax_type: mapTaxType(col(row, mapping.lines.tax_type)),
            tax_rate: taxRate,
            tax_amount: taxAmt,
            line_total: sub,
          });
        }

        if (lineItems.length === 0) { errors++; continue; }

        // ── Totals ───────────────────────────────────────────────────────────
        let subtotal = toFloat(col(row, mapping.invoice.subtotal));
        let taxAmount = toFloat(col(row, mapping.invoice.tax_amount));
        let totalAmount = toFloat(col(row, mapping.invoice.total_amount));

        // Always derive from line items when the column isn't mapped (value is 0)
        // This prevents LegalMonetaryTotal.LineExtensionAmount (subtotal) and
        // InvoiceLine.LineExtensionAmount (line_total) from mismatching in the IRB document.
        if (subtotal === 0) {
          subtotal = lineItems.reduce((s, l) => s + l.line_total, 0);
        }
        if (taxAmount === 0) {
          taxAmount = lineItems.reduce((s, l) => s + l.tax_amount, 0);
        }
        if (totalAmount === 0) {
          totalAmount = subtotal + taxAmount;
        }

        // ── Upsert invoice ───────────────────────────────────────────────────
        const issueDateRaw = col(row, mapping.invoice.issue_date);
        const dueDateRaw = col(row, mapping.invoice.due_date);

        const invoiceData = {
          invoice_type: mapInvoiceType(col(row, mapping.invoice.invoice_type)),
          customer_id: customer._id,
          issue_date: issueDateRaw ? new Date(issueDateRaw) : new Date(),
          due_date: dueDateRaw ? new Date(dueDateRaw) : undefined,
          currency: toStr(col(row, mapping.invoice.currency)).substring(0, 3) || 'MYR',
          exchange_rate: 1.0,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payment_method: mapPaymentMethod(col(row, mapping.invoice.payment_method)),
          status: 'draft' as const,
          items: lineItems,
          source: 'sql' as const,
        };

        if (existingInvoice) {
          // Full sync: update existing draft with latest SQL data
          Object.assign(existingInvoice, invoiceData);
          await existingInvoice.save();
          updated++;
        } else {
          await Invoice.create({
            tenant_id: new mongoose.Types.ObjectId(tenantId),
            invoice_number: invoiceNumber,
            ...invoiceData,
          });
          imported++;
        }
      } catch (rowErr: any) {
        logger.warn('SQL sync: row error', { tenantId, error: rowErr.message });
        errors++;
      }
    }

    const msg = fullSync
      ? `${imported} new, ${updated} updated, ${skipped} skipped, ${errors} errors`
      : `${imported} imported, ${skipped} skipped, ${errors} errors`;
    await TenantSqlConnection.updateOne(
      { tenant_id: new mongoose.Types.ObjectId(tenantId) },
      {
        last_sync_at: new Date(),
        last_sync_status: `OK: ${msg}`,
        last_sync_count: imported,
      }
    );

    return { imported, updated, skipped, errors, message: msg };
  } catch (err: any) {
    const msg = toStr(err.message) || 'Unknown error';
    await TenantSqlConnection.updateOne(
      { tenant_id: new mongoose.Types.ObjectId(tenantId) },
      { last_sync_status: `Error: ${msg}` }
    ).catch(() => {});
    return { imported, updated, skipped, errors: errors + 1, message: `Connection error: ${msg}` };
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

// ─── Batch: all tenants — monthly window (day 1-7) ───────────────────────────

export async function syncAllEnabledSqlTenants(opts: { now: Date; debug?: boolean } = { now: new Date() }): Promise<void> {
  const { now, debug } = opts;
  const day = now.getDate();

  // Production: only run on day 1-7 of each month
  if (!debug && (day < 1 || day > 7)) return;

  const configs = await TenantSqlConnection.find({ is_active: true, auto_sync_enabled: true });

  for (const cfg of configs) {
    if (!debug) {
      // Monthly idempotency: skip if already auto-synced this calendar month
      const last = cfg.last_sync_at;
      if (last && last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth()) {
        continue;
      }
    }

    logger.info('SQL auto-sync: starting monthly sync', { tenantId: cfg.tenant_id, day });
    try {
      const result = await syncTenantSqlInvoices(String(cfg.tenant_id));
      logger.info('SQL auto-sync complete', { tenantId: cfg.tenant_id, ...result });
    } catch (err: any) {
      logger.error('SQL auto-sync error', { tenantId: cfg.tenant_id, error: err.message });
    }
  }
}
