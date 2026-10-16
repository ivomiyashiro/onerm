import type { SyncResult } from '@/domain/repositories/sync-engine';
import type { SyncScheduler } from '@/domain/usecases/sync-scheduler';

/** RN-SYNC-06 (d): a sync right now, for «Reintentar» (RF-SYNC-06.AC5). */
export class SyncNow {
  constructor(private readonly scheduler: Pick<SyncScheduler, 'syncNow'>) {}

  execute(): Promise<SyncResult> {
    return this.scheduler.syncNow();
  }
}
