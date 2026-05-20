import { Router } from 'express';
import { z } from 'zod';
import mysql from 'mysql2/promise';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { extractTenant } from '../middleware/tenant';
import { ValidationError, NotFoundError } from '../utils/errors';
import { TenantSqlConnection } from '../models/TenantSqlConnection';
import { encryption } from '../services/encryption';
import { syncTenantSqlInvoices } from '../services/sqlSyncService';

const router = Router();
router.use(authenticateJWT);
router.use(extractTenant);

// ─── Validation schemas ────────────────────────────────────────────────────────

const columnMappingSchema = z.object({
  invoice: z.object({
    invoice_number: z.string().min(1),
    issue_date: z.string().min(1),
    invoice_type: z.string().optional(),
    due_date: z.string().optional(),
    currency: z.string().optional(),
    subtotal: z.string().optional(),
    tax_amount: z.string().optional(),
    total_amount: z.string().optional(),
    payment_method: z.string().optional(),
    id_column: z.string().optional(),
  }),
  customer: z.object({
    name: z.string().min(1),
    registration_no: z.string().min(1),
    id_type: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    tin_number: z.string().optional(),
    address_line1: z.string().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
    state_code: z.string().optional(),
    country_code: z.string().optional(),
    customer_type: z.string().optional(),
  }),
  lines: z.object({
    description: z.string().min(1),
    quantity: z.string().min(1),
    unit_price: z.string().min(1),
    tax_type: z.string().optional(),
    tax_rate: z.string().optional(),
    tax_amount: z.string().optional(),
    line_total: z.string().optional(),
  }),
});

const upsertSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).default(3306),
  database: z.string().min(1).max(255),
  username: z.string().min(1).max(255),
  password: z.string().optional(),
  invoice_query: z.string().min(1),
  invoice_lines_query: z.string().optional(),
  column_mapping: columnMappingSchema,
  auto_sync_enabled: z.boolean().default(false),
  auto_sync_interval_minutes: z.number().int().min(5).max(1440).default(60),
  is_active: z.boolean().default(true),
});

const testSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(3306),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().default(''),
});

const detectSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(3306),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().default(''),
});

const FIELD_PATTERNS: Record<string, Record<string, string[]>> = {
  invoice: {
    invoice_number: ['inv_no','invoice_no','invoice_number','inv_num','bill_no','receipt_no','doc_no','trans_no','ref_no','invno'],
    issue_date: ['inv_date','invoice_date','bill_date','issue_date','trans_date','date'],
    total_amount: ['total','total_amount','grand_total','inv_total','bill_total'],
    tax_amount: ['tax','tax_amount','gst_amount','sst_amount','tax_total'],
    subtotal: ['subtotal','sub_total','nett','net_amount'],
    payment_method: ['payment_method','pay_method','payment_type'],
    currency: ['currency','currency_code'],
    invoice_type: ['inv_type','invoice_type','doc_type'],
    id_column: ['id'],
    due_date: ['due_date','payment_due'],
  },
  customer: {
    name: ['customer_name','cust_name','client_name','buyer_name','company_name','custname'],
    registration_no: ['reg_no','registration_no','brn','ic_no','nric','company_reg','cust_reg'],
    email: ['email','email_address','cust_email'],
    phone: ['phone','tel','mobile','phone_no','handphone'],
    tin_number: ['tin','tin_no','tin_number'],
    address_line1: ['address','address1','addr','street'],
    city: ['city','town'],
    postcode: ['postcode','postal_code','zip'],
    state_code: ['state','state_code'],
    country_code: ['country','country_code'],
    customer_type: ['customer_type','cust_type'],
    id_type: ['id_type','id_category'],
  },
  lines: {
    description: ['description','item_desc','item_name','product_name','product','item','service','particulars'],
    quantity: ['qty','quantity','units'],
    unit_price: ['unit_price','price','rate','unit_cost','selling_price'],
    line_total: ['amount','line_total','item_total'],
    tax_rate: ['tax_rate','tax_pct','tax_percent'],
    tax_amount: ['tax_amount','item_tax'],
    tax_type: ['tax_type','tax_code'],
  },
};

function matchColumn(cols: string[], candidates: string[]): string {
  for (const c of candidates) {
    const found = cols.find((col) => col.toLowerCase() === c.toLowerCase());
    if (found) return found;
  }
  for (const c of candidates) {
    const found = cols.find((col) => col.toLowerCase().includes(c.toLowerCase()));
    if (found) return found;
  }
  return '';
}

// ─── GET /api/sql-connection ───────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const cfg = await TenantSqlConnection.findOne({ tenant_id: req.tenantId });
    if (!cfg) {
      return res.json({ data: null });
    }

    const safe = cfg.toObject() as any;
    delete safe.password_encrypted;
    safe.has_password = true;

    res.json({ data: safe });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/sql-connection (upsert) ────────────────────────────────────────

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = upsertSchema.parse(req.body);

    const existing = await TenantSqlConnection.findOne({ tenant_id: req.tenantId });

    if (existing) {
      const updateFields: any = {
        host: data.host,
        port: data.port,
        database: data.database,
        username: data.username,
        invoice_query: data.invoice_query,
        invoice_lines_query: data.invoice_lines_query,
        column_mapping: data.column_mapping,
        auto_sync_enabled: data.auto_sync_enabled,
        auto_sync_interval_minutes: data.auto_sync_interval_minutes,
        is_active: data.is_active,
      };

      if (data.password !== undefined) {
        updateFields.password_encrypted = encryption.encrypt(data.password);
      }

      await TenantSqlConnection.updateOne({ tenant_id: req.tenantId }, { $set: updateFields });

      const updated = await TenantSqlConnection.findOne({ tenant_id: req.tenantId });
      const safe = updated!.toObject() as any;
      delete safe.password_encrypted;
      safe.has_password = true;

      return res.json({ data: safe, message: 'SQL connection updated' });
    }

    const created = await TenantSqlConnection.create({
      tenant_id: req.tenantId,
      host: data.host,
      port: data.port,
      database: data.database,
      username: data.username,
      password_encrypted: encryption.encrypt(data.password || ''),
      invoice_query: data.invoice_query,
      invoice_lines_query: data.invoice_lines_query,
      column_mapping: data.column_mapping,
      auto_sync_enabled: data.auto_sync_enabled,
      auto_sync_interval_minutes: data.auto_sync_interval_minutes,
      is_active: data.is_active,
    });

    const safe = created.toObject() as any;
    delete safe.password_encrypted;
    safe.has_password = true;

    res.status(201).json({ data: safe, message: 'SQL connection saved' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new ValidationError('Validation failed', undefined, err.issues));
    }
    next(err);
  }
});

// ─── DELETE /api/sql-connection ───────────────────────────────────────────────

router.delete('/', async (req: AuthRequest, res, next) => {
  try {
    const result = await TenantSqlConnection.deleteOne({ tenant_id: req.tenantId });
    if (result.deletedCount === 0) {
      throw new NotFoundError('No SQL connection configured');
    }
    res.json({ message: 'SQL connection deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/sql-connection/test-saved ──────────────────────────────────────

router.post('/test-saved', async (req: AuthRequest, res, next) => {
  try {
    const cfg = await TenantSqlConnection.findOne({ tenant_id: req.tenantId });
    if (!cfg) {
      return res.json({ success: false, message: 'No saved SQL connection found' });
    }

    let password: string;
    try {
      password = encryption.decrypt(cfg.password_encrypted);
    } catch {
      return res.json({ success: false, message: 'Failed to decrypt stored password' });
    }

    let conn: mysql.Connection | null = null;
    try {
      conn = await mysql.createConnection({
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        user: cfg.username,
        password,
        connectTimeout: 10000,
      });
      await conn.ping();
      res.json({ success: true, message: `Connected to ${cfg.host}:${cfg.port}/${cfg.database}` });
    } catch (connErr: any) {
      res.json({ success: false, message: connErr.message || 'Connection failed' });
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/sql-connection/test ────────────────────────────────────────────

router.post('/test', async (req: AuthRequest, res, next) => {
  try {
    const data = testSchema.parse(req.body);

    let conn: mysql.Connection | null = null;
    try {
      conn = await mysql.createConnection({
        host: data.host,
        port: data.port,
        database: data.database,
        user: data.username,
        password: data.password,
        connectTimeout: 10000,
      });
      await conn.ping();
      res.json({ success: true, message: 'Connection successful' });
    } catch (connErr: any) {
      res.json({ success: false, message: connErr.message || 'Connection failed' });
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new ValidationError('Validation failed', undefined, err.issues));
    }
    next(err);
  }
});

// ─── POST /api/sql-connection/detect ──────────────────────────────────────────

router.post('/detect', async (req: AuthRequest, res, next) => {
  try {
    const data = detectSchema.parse(req.body);

    let conn: mysql.Connection | null = null;
    try {
      conn = await mysql.createConnection({
        host: data.host, port: data.port, database: data.database,
        user: data.username, password: data.password, connectTimeout: 10000,
      });

      const [colRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_KEY
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         ORDER BY TABLE_NAME, ORDINAL_POSITION`
      );

      const tableMap: Record<string, { cols: string[]; pk: string }> = {};
      for (const row of colRows) {
        if (!tableMap[row.TABLE_NAME]) tableMap[row.TABLE_NAME] = { cols: [], pk: '' };
        tableMap[row.TABLE_NAME].cols.push(row.COLUMN_NAME);
        if (row.COLUMN_KEY === 'PRI' && !tableMap[row.TABLE_NAME].pk) {
          tableMap[row.TABLE_NAME].pk = row.COLUMN_NAME;
        }
      }

      const scored = Object.entries(tableMap).map(([table, info]) => {
        let inv = 0, cust = 0, lines = 0;
        for (const candidates of Object.values(FIELD_PATTERNS.invoice)) { if (matchColumn(info.cols, candidates)) inv++; }
        for (const candidates of Object.values(FIELD_PATTERNS.customer)) { if (matchColumn(info.cols, candidates)) cust++; }
        for (const candidates of Object.values(FIELD_PATTERNS.lines)) { if (matchColumn(info.cols, candidates)) lines++; }
        return { table, info, score: inv * 3 + cust * 2 + lines };
      });
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      const colMap: { invoice: Record<string, string>; customer: Record<string, string>; lines: Record<string, string> } =
        { invoice: {}, customer: {}, lines: {} };
      let suggestedQuery = '';

      if (best && best.score > 0) {
        for (const [field, cands] of Object.entries(FIELD_PATTERNS.invoice)) {
          const m = matchColumn(best.info.cols, cands); if (m) colMap.invoice[field] = m;
        }
        if (!colMap.invoice.id_column && best.info.pk) colMap.invoice.id_column = best.info.pk;
        for (const [field, cands] of Object.entries(FIELD_PATTERNS.customer)) {
          const m = matchColumn(best.info.cols, cands); if (m) colMap.customer[field] = m;
        }
        for (const [field, cands] of Object.entries(FIELD_PATTERNS.lines)) {
          const m = matchColumn(best.info.cols, cands); if (m) colMap.lines[field] = m;
        }

        const dateCol = colMap.invoice.issue_date
          || best.info.cols.find((c) => ['created_at','updated_at','modified_at'].includes(c.toLowerCase()));
        suggestedQuery = dateCol
          ? `SELECT * FROM \`${best.table}\` WHERE ${dateCol} >= ?\nORDER BY ${dateCol} ASC`
          : `SELECT * FROM \`${best.table}\``;
        // Note: ? receives a 'YYYY-MM-DD' string so DATE columns compare correctly
      }

      res.json({
        success: true,
        tables: Object.keys(tableMap),
        table_columns: Object.fromEntries(Object.entries(tableMap).map(([t, i]) => [t, i.cols])),
        detected: {
          invoice_table: best?.score > 0 ? best.table : null,
          suggested_query: suggestedQuery,
          column_mapping: colMap,
        },
      });
    } catch (connErr: any) {
      res.status(400).json({ success: false, error: connErr.message || 'Connection or detection failed' });
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) return next(new ValidationError('Invalid parameters'));
    next(err);
  }
});

// ─── GET /api/sql-connection/preview ──────────────────────────────────────────

router.get('/preview', async (req: AuthRequest, res, next) => {
  try {
    const cfg = await TenantSqlConnection.findOne({ tenant_id: req.tenantId, is_active: true });
    if (!cfg) {
      throw new NotFoundError('No active SQL connection configured');
    }

    let password: string;
    try {
      password = encryption.decrypt(cfg.password_encrypted);
    } catch {
      throw new ValidationError('Failed to decrypt SQL password');
    }

    const limit = parseInt(req.query.limit as string) || 5;

    let conn: mysql.Connection | null = null;
    try {
      conn = await mysql.createConnection({
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        user: cfg.username,
        password,
        connectTimeout: 10000,
      });

      const safeQuery = cfg.invoice_query.replace(/\?/g, 'NULL');
      const [rows] = await conn.query(`SELECT * FROM (${safeQuery}) AS __preview LIMIT ${limit}`) as any[];

      res.json({ success: true, data: rows, count: Array.isArray(rows) ? rows.length : 0 });
    } catch (connErr: any) {
      res.json({ success: false, message: connErr.message });
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/sql-connection/sync ────────────────────────────────────────────

router.post('/sync', async (req: AuthRequest, res, next) => {
  try {
    const fullSync = req.body?.full === true;
    const result = await syncTenantSqlInvoices(String(req.tenantId), fullSync);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/sql-connection/reset-sync ──────────────────────────────────────

router.post('/reset-sync', async (req: AuthRequest, res, next) => {
  try {
    const result = await TenantSqlConnection.updateOne(
      { tenant_id: req.tenantId },
      { $unset: { last_sync_at: 1 }, $set: { last_sync_status: 'Reset — next sync will import all rows' } }
    );
    if (result.matchedCount === 0) throw new NotFoundError('No SQL connection configured');
    res.json({ message: 'Sync date reset. Next sync will reimport all rows.' });
  } catch (err) {
    next(err);
  }
});

export default router;
