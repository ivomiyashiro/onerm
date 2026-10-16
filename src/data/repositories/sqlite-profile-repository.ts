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

  /** Saving onto a deleted profile does nothing: a deleted row never comes back (RN-SYNC-15). */
  async save(profile: Profile): Promise<void> {
    this.db().transaction((tx) => {
      const userId = currentUserId(tx);
      // RN-AUTH-06: an account's profile is id = user_id, so there can't be two; the domain
      // creates it with the guest id, the only one it knows.
      const values = { ...fromProfile(profile), id: userId ?? profile.id };
      writeSyncRow(tx, profiles, values, { now: this.now(), userId });
    });
  }
}
