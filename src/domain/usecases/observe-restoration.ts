import type { Unsubscribe } from '@/domain/repositories/observer';
import type { SyncScheduler } from '@/domain/usecases/sync-scheduler';

/** What S23 shows (RF-SYNC-03). */
export type Restoration =
  /** The sync started and is still counting what to download. */
  | { status: 'starting' }
  | { status: 'restoring'; done: number; total: number; percent: number }
  /** AC2: it was cut short; what arrived stays and it goes on by itself. */
  | { status: 'interrupted' }
  /** The sync ended well: everything the account had is here. */
  | { status: 'finished' };

export class ObserveRestoration {
  constructor(private readonly scheduler: Pick<SyncScheduler, 'observeActivity'>) {}

  execute(listener: (restoration: Restoration) => void): Unsubscribe {
    return this.scheduler.observeActivity(({ running, lastResult, restoring }) => {
      if (restoring !== null) {
        const { done, total } = restoring;
        const percent = total === 0 ? 100 : Math.floor((done / total) * 100);
        listener({ status: 'restoring', done, total, percent });
      } else if (!running && (lastResult === 'failed' || lastResult === 'sessionExpired')) {
        listener({ status: 'interrupted' });
      } else if (!running && lastResult === 'synced') {
        listener({ status: 'finished' });
      } else {
        listener({ status: 'starting' });
      }
    });
  }
}
