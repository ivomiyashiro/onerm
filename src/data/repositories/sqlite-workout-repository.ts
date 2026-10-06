import { and, asc, desc, eq, inArray, isNull, notInArray, type SQL } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { workoutExercises, workouts, workoutSets } from '@/data/db/schema';
import { currentUserId, softDelete, writeSyncRow } from '@/data/db/sync-writes';
import type { TableChanges } from '@/data/db/table-changes';
import { fromWorkout, toWorkouts } from '@/data/mappers/workout-mapper';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';

const TABLES = [workouts, workoutExercises, workoutSets];

/**
 * The workout aggregate on SQLite (06 §2, 07 §2.2): read and written as a whole, one transaction
 * per operation. Only live rows with a live parent are emitted (I-07, RN-SYNC-12).
 */
export class SqliteWorkoutRepository implements WorkoutRepository {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly changes: TableChanges,
    private readonly now: () => number,
  ) {}

  observeInProgress(observer: Observer<Workout | null>): Unsubscribe {
    return observeQuery(
      this.changes,
      TABLES,
      // I-04 allows one; the latest wins if a sync ever left two.
      () => this.read(eq(workouts.status, 'in_progress'), desc(workouts.startedAt))[0] ?? null,
      observer,
    );
  }

  observeFinished(observer: Observer<Workout[]>): Unsubscribe {
    return observeQuery(
      this.changes,
      TABLES,
      () => this.read(eq(workouts.status, 'finished'), asc(workouts.finishedAt)),
      observer,
    );
  }

  observeById(id: Id, observer: Observer<Workout | null>): Unsubscribe {
    return observeQuery(
      this.changes,
      TABLES,
      () => this.read(eq(workouts.id, id), asc(workouts.startedAt))[0] ?? null,
      observer,
    );
  }

  /**
   * Writes the aggregate: new and changed rows pending push, unchanged rows untouched. Exercises
   * and sets that are no longer in it are deleted logically (RN-SYNC-15).
   */
  async save(workout: Workout): Promise<void> {
    const rows = fromWorkout(workout);
    this.db().transaction((tx) => {
      const context = { now: this.now(), userId: currentUserId(tx) };
      // A deleted workout never comes back, and neither do children under it (RN-SYNC-15).
      if (writeSyncRow(tx, workouts, rows.workout, context) === 'deleted') return;
      const deletedExercises = new Set<string>();
      for (const exercise of rows.exercises) {
        if (writeSyncRow(tx, workoutExercises, exercise, context) === 'deleted') {
          deletedExercises.add(exercise.id);
        }
      }
      for (const set of rows.sets) {
        // Nothing is written under a deleted exercise: the push would send live rows under a tombstone.
        if (!deletedExercises.has(set.workoutExerciseId))
          writeSyncRow(tx, workoutSets, set, context);
      }

      softDelete(
        tx,
        workoutSets,
        and(
          inArray(workoutSets.workoutExerciseId, exerciseIdsOf(tx, workout.id)),
          notInArray(
            workoutSets.id,
            rows.sets.map((set) => set.id),
          ),
        ),
        context.now,
      );
      softDelete(
        tx,
        workoutExercises,
        and(
          eq(workoutExercises.workoutId, workout.id),
          notInArray(
            workoutExercises.id,
            rows.exercises.map((exercise) => exercise.id),
          ),
        ),
        context.now,
      );
    });
  }

  /** Discarding: logical delete of the workout, its exercises and their sets (06 §3, I-07). */
  async delete(id: Id): Promise<void> {
    this.db().transaction((tx) => {
      const now = this.now();
      softDelete(
        tx,
        workoutSets,
        inArray(workoutSets.workoutExerciseId, exerciseIdsOf(tx, id)),
        now,
      );
      softDelete(tx, workoutExercises, eq(workoutExercises.workoutId, id), now);
      softDelete(tx, workouts, eq(workouts.id, id), now);
    });
  }

  /** The live aggregates that match `where`, in `order`. */
  private read(where: SQL, order: SQL): Workout[] {
    const db = this.db();
    const workoutRows = db
      .select()
      .from(workouts)
      .where(and(isNull(workouts.deletedAt), where))
      .orderBy(order, asc(workouts.id))
      .all();
    const exerciseRows = db
      .select()
      .from(workoutExercises)
      .where(
        and(
          isNull(workoutExercises.deletedAt),
          inArray(
            workoutExercises.workoutId,
            workoutRows.map((row) => row.id),
          ),
        ),
      )
      .all();
    const setRows = db
      .select()
      .from(workoutSets)
      .where(
        and(
          isNull(workoutSets.deletedAt),
          inArray(
            workoutSets.workoutExerciseId,
            exerciseRows.map((row) => row.id),
          ),
        ),
      )
      .all();
    return toWorkouts(workoutRows, exerciseRows, setRows);
  }
}

/** Every exercise of the workout, deleted ones included. */
function exerciseIdsOf(db: AppDatabase, workoutId: Id): string[] {
  return db
    .select({ id: workoutExercises.id })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .all()
    .map((row) => row.id);
}
