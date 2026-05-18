import { Tenant, ITenant } from '../models/Tenant';
import { Invoice } from '../models/Invoice';
import { irbService } from '../services/irbService';
import { resolveIRBCredentials, submitConsolidatedBatchToIRB, IRBSubmissionResult } from '../services/irbSubmitter';
import { progressStore } from '../utils/progressStore';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export interface AutoConsolidationSummary {
  tenantId: string;
  tenantName: string;
  monthLabel: string; // YYYY-MM (the month being consolidated, i.e., previous month)
  totalCandidates: number;
  batches: number;
  batchSize: number;
  succeeded: number;
  failed: number;
  results: IRBSubmissionResult[];
  ranAt: Date;
  error?: string;
}

/**
 * Compute the month boundaries used for auto-consolidation.
 * - Debug mode (AUTO_CONSOLIDATE_DEBUG=true): scans the CURRENT month.
 * - Production: scans the PREVIOUS month (the calendar month that just ended).
 */
function getConsolidationMonthRange(now: Date = new Date()): { start: Date; end: Date; label: string } {
  const offset = config.AUTO_CONSOLIDATE_DEBUG ? 0 : -1;
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1, 0, 0, 0, 0);
  const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  return { start, end, label };
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Run auto-consolidation for a single tenant.
 * Picks unsubmitted invoices from previous month and submits them in batches.
 */
export async function runAutoConsolidationForTenant(
  tenant: ITenant,
  options: { now?: Date; dryRun?: boolean; source?: 'manual' | 'auto' } = {}
): Promise<AutoConsolidationSummary> {
  const now = options.now || new Date();
  const { start, end, label } = getConsolidationMonthRange(now);
  const tenantId = (tenant._id as any).toString();
  const batchSize = tenant.auto_consolidate_batch_size || 20;

  const summary: AutoConsolidationSummary = {
    tenantId,
    tenantName: tenant.company_name,
    monthLabel: label,
    totalCandidates: 0,
    batches: 0,
    batchSize,
    succeeded: 0,
    failed: 0,
    results: [],
    ranAt: now,
  };

  try {
    // Find unsubmitted invoices from previous month for this tenant.
    // Status 'draft' = never submitted; also include invoices that errored before reaching IRB.
    const candidates = await Invoice.find({
      tenant_id: tenant._id,
      deleted_at: null,
      issue_date: { $gte: start, $lt: end },
      status: 'draft',
      $or: [
        { lhdn_submission_uid: { $exists: false } },
        { lhdn_submission_uid: null },
        { lhdn_submission_uid: '' },
      ],
    })
      .select('_id invoice_number issue_date status')
      .sort({ issue_date: 1, created_at: 1 })
      .lean();

    summary.totalCandidates = candidates.length;
    if (candidates.length === 0) {
      return summary;
    }

    if (options.dryRun) {
      summary.batches = chunk(candidates, batchSize).length;
      return summary;
    }

    // Start progress tracking
    const groups = chunk(candidates, batchSize);
    progressStore.start(tenantId, {
      source: options.source || 'auto',
      total: candidates.length,
      batches: groups.length,
    });
    summary.batches = groups.length;

    // Cumulative per-invoice counters used by the onInvoiceDone callback
    let cumulativeProcessed = 0;
    let cumulativeSucceeded = 0;
    let cumulativeFailed = 0;

    // Resolve credentials once and reuse a single access token across the batch run
    const creds = resolveIRBCredentials(tenant);
    if (!creds) {
      summary.error = 'IRB credentials not configured';
      return summary;
    }
    const accessToken = await irbService.getToken(creds.clientId, creds.clientSecret);

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      logger.info('Auto-consolidate: submitting batch', {
        tenantId,
        month: label,
        batch: i + 1,
        of: groups.length,
        size: group.length,
      });

      progressStore.update(tenantId, { currentBatch: i + 1 });

      // Combine all invoices in this group into ONE consolidated document and submit to MyInvois.
      // onInvoiceDone fires after each individual invoice is saved — giving true per-invoice progress.
      const batchResults = await submitConsolidatedBatchToIRB(
        group.map((c) => c._id.toString()),
        tenantId,
        {
          accessToken,
          tenant,
          onInvoiceDone: (success) => {
            cumulativeProcessed++;
            if (success) cumulativeSucceeded++;
            else cumulativeFailed++;
            progressStore.update(tenantId, {
              processed: cumulativeProcessed,
              succeeded: cumulativeSucceeded,
              failed: cumulativeFailed,
            });
          },
        }
      ).catch((err): IRBSubmissionResult[] =>
        group.map((c) => ({
          success: false,
          invoiceId: c._id.toString(),
          invoiceNumber: c.invoice_number,
          error: err?.message || 'Unhandled error',
        }))
      );

      for (const r of batchResults) {
        summary.results.push(r);
        if (r.success) summary.succeeded++;
        else summary.failed++;
      }
    }

    return summary;
  } catch (err: any) {
    logger.error('Auto-consolidate: tenant run failed', { tenantId, error: err.message });
    summary.error = err.message || 'Unknown error';
    return summary;
  } finally {
    try {
      await Tenant.updateOne(
        { _id: tenant._id },
        {
          $set: {
            auto_consolidate_last_run_at: new Date(),
            auto_consolidate_last_status: summary.error
              ? `error: ${summary.error}`.slice(0, 500)
              : `ok: month=${summary.monthLabel} candidates=${summary.totalCandidates} batches=${summary.batches} success=${summary.succeeded} failed=${summary.failed}`.slice(0, 500),
          },
        }
      );
    } catch (e: any) {
      logger.warn('Auto-consolidate: failed to persist last_run', { tenantId, error: e.message });
    }
    progressStore.finish(tenantId);
  }
}

/**
 * Run auto-consolidation for every tenant whose feature is enabled and which
 * has not yet been processed for the current calendar month.
 *
 * Intended to be invoked daily during the 1st-7th window by the scheduler.
 */
export async function runAutoConsolidationForAllTenants(
  options: { now?: Date; force?: boolean } = {}
): Promise<AutoConsolidationSummary[]> {
  const now = options.now || new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();

  const tenants = await Tenant.find({
    deleted_at: null,
    auto_consolidate_enabled: true,
  });

  const summaries: AutoConsolidationSummary[] = [];

  for (const tenant of tenants) {
    const triggerDay = tenant.auto_consolidate_day || 5;

    // Skip tenants whose configured trigger day has not yet been reached
    if (!options.force && day < triggerDay) {
      continue;
    }

    // Idempotency: skip if already run successfully this calendar month
    if (!options.force && tenant.auto_consolidate_last_run_at) {
      const last = new Date(tenant.auto_consolidate_last_run_at);
      if (last.getFullYear() === year && last.getMonth() === month) {
        continue;
      }
    }

    logger.info('Auto-consolidate: running for tenant', {
      tenantId: (tenant._id as any).toString(),
      tenantName: tenant.company_name,
      day,
      triggerDay,
    });

    const summary = await runAutoConsolidationForTenant(tenant, { now });
    summaries.push(summary);
  }

  return summaries;
}
