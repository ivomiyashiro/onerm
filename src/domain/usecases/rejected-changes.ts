import type { RejectedChange } from '@/domain/models/rejected-change';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { RejectedChangeRepository } from '@/domain/repositories/rejected-change-repository';
import type { SyncScheduler } from '@/domain/usecases/sync-scheduler';

/** S25: the changes the server rejected (RN-SYNC-11). */
export class ObserveRejectedChanges {
  constructor(private readonly changes: Pick<RejectedChangeRepository, 'observe'>) {}

  execute(observer: Observer<RejectedChange[]>): Unsubscribe {
    return this.changes.observe(observer);
  }
}

/** D12 «Descartar este cambio» (RF-SYNC-06.AC4). */
export class DiscardRejectedChange {
  constructor(private readonly changes: Pick<RejectedChangeRepository, 'discard'>) {}

  execute(change: RejectedChange): Promise<'done' | 'offline'> {
    return this.changes.discard(change);
  }
}

/** D12 «Reintentar»: the change goes up again now, for example after updating the app. */
export class RetryRejectedChange {
  constructor(
    private readonly changes: Pick<RejectedChangeRepository, 'retry'>,
    private readonly scheduler: Pick<SyncScheduler, 'syncNow'>,
  ) {}

  async execute(change: RejectedChange): Promise<void> {
    await this.changes.retry(change);
    await this.scheduler.syncNow();
  }
}
