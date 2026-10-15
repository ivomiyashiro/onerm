import type { Unsubscribe } from '@/domain/repositories/observer';
import type { SyncTriggers } from '@/domain/repositories/sync-triggers';
import type { SyncScheduler } from '@/domain/usecases/sync-scheduler';

/**
 * Keeps the local changes backed up while the app runs (RF-SYNC-01): syncs on opening and on each
 * trigger of RN-SYNC-06, with the scheduler deciding when. Returns how to stop.
 */
export class KeepBackedUp {
  constructor(
    private readonly scheduler: SyncScheduler,
    private readonly triggers: SyncTriggers,
  ) {}

  execute(): Unsubscribe {
    const { scheduler } = this;
    const unsubscribe = this.triggers.subscribe({
      localWrite: () => scheduler.afterWrite(),
      foreground: () => scheduler.enterForeground(),
      background: () => scheduler.enterBackground(),
      reconnected: () => scheduler.afterReconnect(),
    });
    // RN-SYNC-06 (c): opening the app is a trigger too.
    scheduler.enterForeground();
    return () => {
      unsubscribe();
      scheduler.stop();
    };
  }
}
