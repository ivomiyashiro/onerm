import type { Unsubscribe } from '@/domain/repositories/observer';
import type { SyncActivity, SyncScheduler } from '@/domain/usecases/sync-scheduler';

/** What the sync is doing (RN-SYNC-06): something waiting for a connection retries after a run. */
export class ObserveSyncActivity {
  constructor(private readonly scheduler: Pick<SyncScheduler, 'observeActivity'>) {}

  execute(listener: (activity: SyncActivity) => void): Unsubscribe {
    return this.scheduler.observeActivity(listener);
  }
}
