import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { appState } from '@/data/db/schema';
import type { TableChanges } from '@/data/db/table-changes';
import type { RestTimer } from '@/domain/models/rest-timer';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { RestTimerRepository } from '@/domain/repositories/rest-timer-repository';

/** The rest timer in the single row of `app_state` (07 §2.4): local only, never synced. */
export class SqliteRestTimerRepository implements RestTimerRepository {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly changes: TableChanges,
  ) {}

  observe(observer: Observer<RestTimer>): Unsubscribe {
    return observeQuery(this.changes, [appState], () => this.read(), observer);
  }

  async get(): Promise<RestTimer> {
    return this.read();
  }

  async saveEndsAt(endsAt: Date | null): Promise<void> {
    const restTimerEndsAt = endsAt?.getTime() ?? null;
    this.db()
      .insert(appState)
      .values({ restTimerEndsAt })
      .onConflictDoUpdate({ target: appState.id, set: { restTimerEndsAt } })
      .run();
  }

  async markNotificationPermissionAsked(): Promise<void> {
    this.db()
      .insert(appState)
      .values({ notificationPermissionAsked: true })
      .onConflictDoUpdate({ target: appState.id, set: { notificationPermissionAsked: true } })
      .run();
  }

  private read(): RestTimer {
    const row = this.db().select().from(appState).get();
    return {
      endsAt: row?.restTimerEndsAt == null ? null : new Date(row.restTimerEndsAt),
      notificationPermissionAsked: row?.notificationPermissionAsked ?? false,
    };
  }
}
