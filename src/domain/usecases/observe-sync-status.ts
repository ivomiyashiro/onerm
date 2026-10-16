import type { SyncStatus } from '@/domain/models/sync-status';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { Workout } from '@/domain/models/workout';
import type {
  LocalSyncState,
  SyncStateRepository,
} from '@/domain/repositories/sync-state-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { syncStatusOf } from '@/domain/rules/sync/sync-status';
import { observeTogether } from '@/domain/usecases/observe-together';
import type { SyncActivity, SyncScheduler } from '@/domain/usecases/sync-scheduler';

/** The account part of the status, which the app already keeps (RF-AUTH-06). */
export interface AccountForSync {
  owner: 'guest' | 'user';
  sessionExpired: boolean;
}

/**
 * The backup status of S21 and the discreet notice of S07 (RF-SYNC-06), again on every change of
 * the local data, the workout in progress or the sync itself.
 */
export class ObserveSyncStatus {
  constructor(
    private readonly local: Pick<SyncStateRepository, 'observe'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress'>,
    private readonly scheduler: Pick<SyncScheduler, 'observeActivity'>,
  ) {}

  execute(account: AccountForSync, observer: Observer<SyncStatus>): Unsubscribe {
    const activity = (next: Observer<SyncActivity>) =>
      this.scheduler.observeActivity((value) => next.next(value));
    return observeTogether<[LocalSyncState, Workout | null, SyncActivity]>(
      [
        (next) => this.local.observe(next),
        (next) => this.workouts.observeInProgress(next),
        activity,
      ],
      {
        next: ([local, workout, { running, lastResult, online }]) =>
          observer.next(
            syncStatusOf({
              ...local,
              // The account the app keeps decides the owner and the session (RF-AUTH-06).
              ...account,
              running,
              lastResult,
              online,
              workoutInProgress: workout !== null,
            }),
          ),
        error: (error) => observer.error(error),
      },
    );
  }
}
