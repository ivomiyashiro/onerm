import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Common columns of every syncable table (07 §2.1).
const syncColumns = {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  serverUpdatedAt: integer('server_updated_at'),
  dirty: integer('_dirty', { mode: 'boolean' }).notNull().default(true),
  conflict: text('_conflict'),
};

export const workouts = sqliteTable(
  'workouts',
  {
    ...syncColumns,
    routineNameSnapshot: text('routine_name_snapshot').notNull(),
    status: text('status', { enum: ['in_progress', 'finished'] }).notNull(),
    startedAt: integer('started_at').notNull(),
    notes: text('notes'),
  },
  (t) => [check('workouts_status_check', sql`${t.status} in ('in_progress', 'finished')`)],
);

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    ...syncColumns,
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id),
    position: integer('position').notNull(),
    loadKg: real('load_kg'),
    reps: integer('reps'),
  },
  (t) => [
    index('workout_sets_workout_idx').on(t.workoutId),
    check('workout_sets_reps_check', sql`${t.reps} between 0 and 100`),
  ],
);
