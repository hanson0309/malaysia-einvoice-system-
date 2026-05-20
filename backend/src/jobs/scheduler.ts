import { runAutoConsolidationForAllTenants } from './autoConsolidate';
import { syncAllEnabledSqlTenants } from '../services/sqlSyncService';
import { logger } from '../utils/logger';
import { config } from '../config/env';

// Two modes, switched via env var AUTO_CONSOLIDATE_DEBUG:
//  - debug=true  -> tick every 2 min, no day-of-month gate, no monthly
//                   idempotency, scans CURRENT month (see autoConsolidate.ts).
//  - debug=false -> tick hourly, only fires on day 1-7, idempotent per
//                   calendar month, scans PREVIOUS month.
const DEBUG = config.AUTO_CONSOLIDATE_DEBUG;
const SQL_DEBUG = config.SQL_DEBUG;
const TICK_MS = DEBUG ? 2 * 60 * 1000 : 60 * 60 * 1000;
const INITIAL_DELAY_MS = DEBUG ? 10 * 1000 : 30 * 1000;

let timer: NodeJS.Timeout | null = null;
let sqlTimer: NodeJS.Timeout | null = null;
let running = false;
let sqlRunning = false;

/**
 * Internal tick: trigger auto-consolidation.
 *  - Production: only during day 1-7 of the month, idempotent per tenant per month.
 *  - Test mode: every tick, ignoring day window and monthly idempotency (force=true).
 */
async function tick() {
  if (running) return;
  running = true;
  try {
    const now = new Date();

    if (!DEBUG) {
      const day = now.getDate();
      if (day < 1 || day > 7) return;
    }

    const summaries = await runAutoConsolidationForAllTenants({
      now,
      force: DEBUG, // skip day check & monthly idempotency when debugging
    });
    if (summaries.length > 0) {
      logger.info('Auto-consolidate scheduler tick complete', {
        debug: DEBUG,
        tenantsProcessed: summaries.length,
        succeeded: summaries.reduce((a, s) => a + s.succeeded, 0),
        failed: summaries.reduce((a, s) => a + s.failed, 0),
      });
    } else {
      logger.info('Auto-consolidate scheduler tick: no tenants processed', {
        debug: DEBUG,
      });
    }

    // SQL auto-sync: only in production mode (SQL_DEBUG uses its own 1-min timer)
    if (!SQL_DEBUG) {
      try {
        await syncAllEnabledSqlTenants({ now, debug: false });
      } catch (err: any) {
        logger.error('SQL auto-sync scheduler tick failed', { error: err.message });
      }
    }
  } catch (err: any) {
    logger.error('Auto-consolidate scheduler tick failed', { error: err.message });
  } finally {
    running = false;
  }
}

/**
 * Start the in-process scheduler. Runs once shortly after boot and then on a
 * fixed interval. The job is opt-in per tenant via `auto_consolidate_enabled`
 * and runs server-side regardless of whether any user is logged in.
 */
async function sqlTick() {
  if (sqlRunning) return;
  sqlRunning = true;
  try {
    await syncAllEnabledSqlTenants({ now: new Date(), debug: true });
  } catch (err: any) {
    logger.error('SQL debug auto-sync tick failed', { error: err.message });
  } finally {
    sqlRunning = false;
  }
}

export function startAutoConsolidateScheduler() {
  if (timer) return;
  logger.info(
    `Starting auto-consolidate scheduler (${DEBUG ? 'DEBUG mode: every 2 min, current month, no day gate' : 'production: hourly, day 1-7, previous month'})`
  );
  setTimeout(() => {
    void tick();
  }, INITIAL_DELAY_MS);
  timer = setInterval(() => {
    void tick();
  }, TICK_MS);

  // SQL_DEBUG=true: run SQL auto-sync independently every 1 minute
  if (SQL_DEBUG) {
    logger.info('SQL auto-sync DEBUG timer started (every 1 min, SQL_DEBUG=true)');
    setTimeout(() => { void sqlTick(); }, 15 * 1000); // first run after 15s
    sqlTimer = setInterval(() => { void sqlTick(); }, 60 * 1000);
  }
}

export function stopAutoConsolidateScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (sqlTimer) {
    clearInterval(sqlTimer);
    sqlTimer = null;
  }
}
