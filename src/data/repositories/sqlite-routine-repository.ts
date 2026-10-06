import { and, eq, inArray, isNull, notInArray } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { routineDays, routineExercises, routines } from '@/data/db/schema';
import { currentUserId, softDelete, writeSyncRow } from '@/data/db/sync-writes';
import type { TableChanges } from '@/data/db/table-changes';
import { fromRoutine, toRoutines } from '@/data/mappers/routine-mapper';
import type { Routine } from '@/domain/models/routine';
import type { Id } from '@/domain/models/vocabulary';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';

const TABLES = [routines, routineDays, routineExercises];

/**
 * The routine aggregate on SQLite (06 §2, 07 §2.2): read and written as a whole, one transaction
 * per operation. Only live rows with a live parent are emitted (I-07, RN-SYNC-12).
 */
export class SqliteRoutineRepository implements RoutineRepository {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly changes: TableChanges,
    private readonly now: () => number,
  ) {}

  observeAll(observer: Observer<Routine[]>): Unsubscribe {
    return observeQuery(this.changes, TABLES, () => this.read(), observer);
  }

  observeById(id: Id, observer: Observer<Routine | null>): Unsubscribe {
    return observeQuery(this.changes, TABLES, () => this.read(id)[0] ?? null, observer);
  }

  /**
   * Writes the aggregate: new and changed rows pending push, unchanged rows untouched. Days and
   * exercises that are no longer in it are deleted logically (RN-SYNC-15).
   */
  async save(routine: Routine): Promise<void> {
    const rows = fromRoutine(routine);
    this.db().transaction((tx) => {
      const context = { now: this.now(), userId: currentUserId(tx) };
      // A deleted routine never comes back, and neither do children under it (RN-SYNC-15).
      if (writeSyncRow(tx, routines, rows.routine, context) === 'deleted') return;
      const deletedDays = new Set<string>();
      for (const day of rows.days) {
        if (writeSyncRow(tx, routineDays, day, context) === 'deleted') deletedDays.add(day.id);
      }
      for (const exercise of rows.exercises) {
        // Nothing is written under a deleted day: the push would send live rows under a tombstone.
        if (!deletedDays.has(exercise.routineDayId)) {
          writeSyncRow(tx, routineExercises, exercise, context);
        }
      }

      const keptDays = rows.days.map((day) => day.id);
      const keptExercises = rows.exercises.map((exercise) => exercise.id);
      softDelete(
        tx,
        routineExercises,
        and(
          inArray(routineExercises.routineDayId, dayIdsOf(tx, routine.id)),
          notInArray(routineExercises.id, keptExercises),
        ),
        context.now,
      );
      softDelete(
        tx,
        routineDays,
        and(eq(routineDays.routineId, routine.id), notInArray(routineDays.id, keptDays)),
        context.now,
      );
    });
  }

  /** Logical delete of the routine with its days and their exercises, in one transaction (I-07). */
  async delete(id: Id): Promise<void> {
    this.db().transaction((tx) => {
      const now = this.now();
      softDelete(
        tx,
        routineExercises,
        inArray(routineExercises.routineDayId, dayIdsOf(tx, id)),
        now,
      );
      softDelete(tx, routineDays, eq(routineDays.routineId, id), now);
      softDelete(tx, routines, eq(routines.id, id), now);
    });
  }

  /** The live aggregates, or the one with `id`. */
  private read(id?: Id): Routine[] {
    const db = this.db();
    const routineRows = db
      .select()
      .from(routines)
      .where(and(isNull(routines.deletedAt), id === undefined ? undefined : eq(routines.id, id)))
      .orderBy(routines.createdAt, routines.id)
      .all();
    const routineIds = routineRows.map((row) => row.id);
    const dayRows = db
      .select()
      .from(routineDays)
      .where(and(isNull(routineDays.deletedAt), inArray(routineDays.routineId, routineIds)))
      .all();
    const exerciseRows = db
      .select()
      .from(routineExercises)
      .where(
        and(
          isNull(routineExercises.deletedAt),
          inArray(
            routineExercises.routineDayId,
            dayRows.map((day) => day.id),
          ),
        ),
      )
      .all();
    return toRoutines(routineRows, dayRows, exerciseRows);
  }
}

/** Every day of the routine, deleted ones included. */
function dayIdsOf(db: AppDatabase, routineId: Id): string[] {
  return db
    .select({ id: routineDays.id })
    .from(routineDays)
    .where(eq(routineDays.routineId, routineId))
    .all()
    .map((day) => day.id);
}
