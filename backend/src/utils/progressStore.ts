export interface JobProgress {
  running: boolean;
  source: 'manual' | 'auto';
  total: number;
  batches: number;
  currentBatch: number;
  processed: number;
  succeeded: number;
  failed: number;
  startedAt: string;
  updatedAt: string;
}

const store = new Map<string, JobProgress>();

export const progressStore = {
  start(tenantId: string, init: Pick<JobProgress, 'source' | 'total' | 'batches'>): void {
    store.set(tenantId, {
      running: true,
      source: init.source,
      total: init.total,
      batches: init.batches,
      currentBatch: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  update(
    tenantId: string,
    delta: Partial<Pick<JobProgress, 'currentBatch' | 'processed' | 'succeeded' | 'failed'>>
  ): void {
    const p = store.get(tenantId);
    if (!p) return;
    store.set(tenantId, { ...p, ...delta, updatedAt: new Date().toISOString() });
  },

  finish(tenantId: string): void {
    const p = store.get(tenantId);
    if (!p) return;
    store.set(tenantId, { ...p, running: false, updatedAt: new Date().toISOString() });
  },

  get(tenantId: string): JobProgress | null {
    return store.get(tenantId) ?? null;
  },
};
