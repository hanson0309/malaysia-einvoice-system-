import { config } from '../config/env';

export function buildReceiptClaimUrl(receiptNo: string, tenantId: string): string {
  const base = (config.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const encoded = encodeURIComponent(receiptNo);
  return `${base}/receipt/${encoded}?tenant=${tenantId}`;
}
