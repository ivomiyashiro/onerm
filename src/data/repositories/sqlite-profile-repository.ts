import { isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { profiles } from '@/data/db/schema';
import { currentUserId, writeSyncRow } from '@/data/db/sync-writes';
import type { TableChanges } from '@/data/db/table-changes';
import { fromProfile, toProfile } from '@/data/mappers/profile-mapper';
import type { Profile } from '@/domain/models/profile';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';

/** The profile of the device's owner: the single live row of `profiles` (07 §2.2). */
export class SqliteProfileRepository implements ProfileRepository {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly changes: TableChanges,
    private readonly now: () => number,
  ) {}

  observe(observer: Observer<Profile | null>): Unsubscribe {
    return observeQuery(
      this.changes,
      [profiles],
      () => {
        const row = this.db().select().from(profiles).where(isNull(profiles.deletedAt)).get();
        return row === undefined ? null : toProfile(row);
      },
      observer,
    );
  }

  async save(profile: Profile): Promise<void> {
    const db = this.db();
    db.transaction((tx) => {
      writeSyncRow(tx, profiles, fromProfile(profile), {
        now: this.now(),
        userId: currentUserId(tx),
      });
    });
  }
}
