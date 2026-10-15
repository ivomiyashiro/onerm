import { and, count, eq, inArray, ne } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import {
  appState,
  profiles,
  routineDays,
  routineExercises,
  routines,
  syncState,
  workoutExercises,
  workouts,
  workoutSets,
} from '@/data/db/schema';
import { USER_TABLES } from '@/data/sync/sync-tables';
import type { DataOwner } from '@/domain/models/data-owner';
import type { AccountRepository } from '@/domain/repositories/account-repository';

/** Who owns the local data (`app_state.owner`, 07 §2.4) and what depends on it. */
export class SqliteAccountRepository implements AccountRepository {
  constructor(private readonly db: () => AppDatabase) {}

  async readOwner(): Promise<DataOwner> {
    const owner = this.db().select().from(appState).get()?.owner ?? 'guest';
    return owner === 'guest' ? { kind: 'guest' } : { kind: 'user', userId: owner };
  }

  async saveOwner(owner: DataOwner): Promise<void> {
    const value = owner.kind === 'guest' ? 'guest' : owner.userId;
    this.db()
      .insert(appState)
      .values({ owner: value })
      .onConflictDoUpdate({ target: appState.id, set: { owner: value } })
      .run();
  }

  async readPendingMigration(): Promise<string | null> {
    return this.db().select().from(appState).get()?.pendingMigrationUid ?? null;
  }

  async savePendingMigration(userId: string | null): Promise<void> {
    this.db()
      .insert(appState)
      .values({ pendingMigrationUid: userId })
      .onConflictDoUpdate({ target: appState.id, set: { pendingMigrationUid: userId } })
      .run();
  }

  async readOwnerEmail(): Promise<string | null> {
    return this.db().select().from(appState).get()?.ownerEmail ?? null;
  }

  async saveOwnerEmail(email: string | null): Promise<void> {
    this.db()
      .insert(appState)
      .values({ ownerEmail: email })
      .onConflictDoUpdate({ target: appState.id, set: { ownerEmail: email } })
      .run();
  }

  async readLastNudgeAt(): Promise<Date | null> {
    const stored = this.db().select().from(appState).get()?.lastAccountNudgeAt ?? null;
    return stored === null ? null : new Date(stored);
  }

  async saveLastNudgeAt(at: Date): Promise<void> {
    const value = at.getTime();
    this.db()
      .insert(appState)
      .values({ lastAccountNudgeAt: value })
      .onConflictDoUpdate({ target: appState.id, set: { lastAccountNudgeAt: value } })
      .run();
  }

  async hasWorkoutInProgress(): Promise<boolean> {
    return (
      this.db().select({ id: workouts.id }).from(workouts).where(inProgress()).get() !== undefined
    );
  }

  /**
   * Rows with `_dirty = 1` (RN-SYNC-08). A workout in progress and its children don't count: they
   * are not uploaded until it is finished (RN-SYNC-13).
   */
  async countPendingChanges(): Promise<number> {
    const db = this.db();
    const countOf = (rows: { n: number }[]) => rows[0]?.n ?? 0;

    const finishedWorkouts = db
      .select({ id: workouts.id })
      .from(workouts)
      .where(ne(workouts.status, 'in_progress'));
    const finishedExercises = db
      .select({ id: workoutExercises.id })
      .from(workoutExercises)
      .where(inArray(workoutExercises.workoutId, finishedWorkouts));

    return [
      db.select({ n: count() }).from(profiles).where(eq(profiles.dirty, true)),
      db.select({ n: count() }).from(routines).where(eq(routines.dirty, true)),
      db.select({ n: count() }).from(routineDays).where(eq(routineDays.dirty, true)),
      db.select({ n: count() }).from(routineExercises).where(eq(routineExercises.dirty, true)),
      db
        .select({ n: count() })
        .from(workouts)
        .where(and(eq(workouts.dirty, true), ne(workouts.status, 'in_progress'))),
      db
        .select({ n: count() })
        .from(workoutExercises)
        .where(
          and(
            eq(workoutExercises.dirty, true),
            inArray(workoutExercises.workoutId, finishedWorkouts),
          ),
        ),
      db
        .select({ n: count() })
        .from(workoutSets)
        .where(
          and(
            eq(workoutSets.dirty, true),
            inArray(workoutSets.workoutExerciseId, finishedExercises),
          ),
        ),
    ].reduce((total, query) => total + countOf(query.all()), 0);
  }

  async clearUserData(): Promise<void> {
    this.db().transaction((tx) => {
      // Children first: the foreign keys are on.
      tx.delete(workoutSets).run();
      tx.delete(workoutExercises).run();
      tx.delete(workouts).run();
      tx.delete(routineExercises).run();
      tx.delete(routineDays).run();
      tx.delete(routines).run();
      tx.delete(profiles).run();
      // The user's pull cursors go; the catalog's stay with the catalog (RF-CAT-04).
      tx.delete(syncState)
        .where(
          inArray(
            syncState.tableName,
            USER_TABLES.map((sync) => sync.name),
          ),
        )
        .run();
      // The catalog and its version stay; the rest of app_state goes back to a fresh guest.
      tx.insert(appState)
        .values({ owner: 'guest' })
        .onConflictDoUpdate({
          target: appState.id,
          set: {
            owner: 'guest',
            pendingMigrationUid: null,
            ownerEmail: null,
            onboardingStep: null,
            restTimerEndsAt: null,
            lastAccountNudgeAt: null,
          },
        })
        .run();
    });
  }
}

const inProgress = () => eq(workouts.status, 'in_progress');
