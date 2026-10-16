import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type {
  LocalSyncState,
  SyncStateRepository,
} from '@/domain/repositories/sync-state-repository';
import { observeTogether } from '@/domain/usecases/observe-together';
import type { SyncActivity, SyncScheduler } from '@/domain/usecases/sync-scheduler';

/** The discreet notice of S07 (08 §5): only what is waiting, never an error. */
export type BackupNotice =
  /** RF-SYNC-03.AC2: the restoration didn't reach the end yet. */
  | { kind: 'restoreIncomplete' }
  | { kind: 'pending'; count: number; online: boolean }
  | { kind: 'conflict'; count: number };

export class ObserveBackupNotice {
  constructor(
    private readonly local: Pick<SyncStateRepository, 'observe'>,
    private readonly scheduler: Pick<SyncScheduler, 'observeActivity'>,
  ) {}

  /**
   * A restoration not finished first (the suggestions may lack data), then the rejected changes
   * (they need the person, RN-SYNC-11), then the pending ones. Until the
   * device reports its connection it counts as online: «por respaldar», not «sin conexión».
   */
  execute(observer: Observer<BackupNotice | null>): Unsubscribe {
    return observeTogether<[LocalSyncState, SyncActivity]>(
      [
        (next) => this.local.observe(next),
        (next) => this.scheduler.observeActivity((activity) => next.next(activity)),
      ],
      {
        next: ([{ owner, restoreCompleted, pending, conflicts }, { online }]) => {
          if (owner === 'user' && !restoreCompleted) observer.next({ kind: 'restoreIncomplete' });
          else if (conflicts > 0) observer.next({ kind: 'conflict', count: conflicts });
          else if (pending > 0)
            observer.next({ kind: 'pending', count: pending, online: online !== false });
          else observer.next(null);
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
