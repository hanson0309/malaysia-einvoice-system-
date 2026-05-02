import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/config/database';

async function runMigrations() {
  const migrations = [
    '001_create_tenants.sql',
    '002_create_users.sql',
    '003_create_customers.sql',
    '004_create_products.sql',
    '005_create_invoices.sql',
    '006_create_invoice_items.sql',
    '007_create_invoice_tax_summary.sql',
    '008_create_submission_logs.sql',
    '009_create_attachments.sql',
    '010_create_audit_logs.sql',
    '011_create_webhook_events.sql',
  ];

  for (const migration of migrations) {
    console.log(`Running migration: ${migration}`);
    const sql = readFileSync(join(__dirname, '../migrations', migration), 'utf8');
    await pool.query(sql);
    console.log(`✓ ${migration} completed`);
  }

  console.log('All migrations completed successfully');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
