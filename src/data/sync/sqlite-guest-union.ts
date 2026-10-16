import type { SupabaseClient } from '@supabase/supabase-js';
import { and, count, eq, isNull, ne, sql } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { appState, profiles, routines, workouts } from '@/data/db/schema';
import type { GuestSummary, GuestUnion } from '@/domain/repositories/guest-union';

import { writeRemoteRow } from './pull';
import { USER_TABLES, type RemoteRow } from './sync-tables';

/** The user tables after the profile, which has its own step (07 §4.3 step 2). */
const DATA_TABLES = USER_TABLES.filter((sync) => sync.table !== profiles);
const PROFILE_SYNC = USER_TABLES.find((sync) => sync.table === profiles)!;

/**
 * The union of 07 §4.3 on the local database, with the server only to read the account. The
 * guest's rows are the ones with `user_id` null (07 §2.1).
 */
export class SqliteGuestUnion implements GuestUnion {
  constructor(
    private readonly db: () => AppDatabase,
    /** Null without a server configured. */
    private readonly client: SupabaseClient | null,
  ) {}

  async guestSummary(): Promise<GuestSummary> {
    const db = this.db();
    const countOf = (table: typeof routines | typeof workouts, where: ReturnType<typeof and>) =>
      db.select({ n: count() }).from(table).where(where).get()?.n ?? 0;
    const guestLive = (table: typeof routines | typeof workouts) =>
      and(isNull(table.userId), isNull(table.deletedAt));
    return {
      workouts: countOf(workouts, and(guestLive(workouts), eq(workouts.status, 'finished'))),
      routines: countOf(routines, guestLive(routines)),
      workoutInProgress:
        countOf(workouts, and(guestLive(workouts), ne(workouts.status, 'finished'))) > 0,
    };
  }

  async accountHasData(userId: string): Promise<boolean | 'offline'> {
    if (this.client === null) return 'offline';
    // RN-AUTH-05: a routine or a finished workout, not deleted. The server only has finished ones.
    for (const name of ['routines', 'workouts']) {
      const { count: rows, error } = await this.client
        .from(name)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null);
      if (error !== null) return 'offline';
      if ((rows ?? 0) > 0) return true;
    }
    return false;
  }

  async unite({
    userId,
    email,
    keepGuestData,
  }: {
    userId: string;
    email: string | null;
    keepGuestData: boolean;
  }): Promise<'done' | 'offline'> {
    if (this.client === null) return 'offline';
    const { data, error } = await this.client
      .from('profiles')
      .select()
      .eq('user_id', userId)
      .maybeSingle();
    if (error !== null) return 'offline';
    const accountProfile = data as RemoteRow | null;
    const now = Date.now();

    this.db().transaction((tx) => {
      uniteProfile(tx, userId, accountProfile, keepGuestData, now);
      if (keepGuestData) reassignGuestRows(tx, userId, now);
      else deleteGuestRows(tx);
      // Step 6: the device is the account's.
      tx.insert(appState)
        .values({ owner: userId, ownerEmail: email, pendingMigrationUid: null })
        .onConflictDoUpdate({
          target: appState.id,
          set: { owner: userId, ownerEmail: email, pendingMigrationUid: null },
        })
        .run();
    });
    return 'done';
  }
}

/**
 * Step 2 (RN-AUTH-06, RN-AUTH-04): the account's profile wins and the guest's is discarded;
 * without one, the guest's becomes the account's (`id = user_id`, pending). The guest's row is
 * deleted physically first, so there are never two live profiles (RN-SYNC-15). The account keeps
 * its active routine, or takes the guest's if it has none and the guest's data is kept.
 */
function uniteProfile(
  db: AppDatabase,
  userId: string,
  accountProfile: RemoteRow | null,
  keepGuestData: boolean,
  now: number,
) {
  const guest = db.select().from(profiles).where(isNull(profiles.userId)).get();
  db.delete(profiles).where(isNull(profiles.userId)).run();

  if (accountProfile !== null) {
    writeRemoteRow(db, PROFILE_SYNC, accountProfile);
    if (keepGuestData && accountProfile.active_routine_id === null && guest?.activeRoutineId) {
      db.update(profiles)
        .set({
          activeRoutineId: guest.activeRoutineId,
          updatedAt: sql`max(${now}, ${profiles.updatedAt} + 1)`,
          dirty: true,
        })
        .where(eq(profiles.id, userId))
        .run();
    }
    return;
  }
  if (guest !== undefined && guest.deletedAt === null) {
    db.insert(profiles)
      .values({
        ...guest,
        id: userId,
        userId,
        updatedAt: Math.max(now, guest.updatedAt + 1),
        dirty: true,
      })
      .run();
  }
}

/** Steps 4 and 5 «Sumar»: every guest row becomes the account's and pending (RN-GEN-03). */
function reassignGuestRows(db: AppDatabase, userId: string, now: number) {
  for (const sync of DATA_TABLES) {
    const table = sync.table as typeof routines;
    db.update(table)
      .set({ userId, updatedAt: sql`max(${now}, ${table.updatedAt} + 1)`, dirty: true })
      .where(isNull(table.userId))
      .run();
  }
}

/** Step 5 «Descartar»: the guest rows never reached the server, so they go physically (RN-SYNC-15). */
function deleteGuestRows(db: AppDatabase) {
  // Children first: the foreign keys are on.
  for (const sync of [...DATA_TABLES].reverse()) {
    const table = sync.table as typeof routines;
    db.delete(table).where(isNull(table.userId)).run();
  }
}
