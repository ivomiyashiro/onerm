import { sql, type SQL } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

import type { ExerciseAttribution } from '@/domain/models/exercise';
import type { LoadIncrements } from '@/domain/models/profile';
import {
  EFFORT_MODES,
  EQUIPMENT,
  EXERCISE_ROLES,
  EXPERIENCE_LEVELS,
  LOAD_TYPES,
  LOAD_UNITS,
  MECHANICS,
  TRAINING_GOALS,
  type Equipment,
  type Muscle,
} from '@/domain/models/vocabulary';
import { WORKOUT_EXERCISE_STATUSES, WORKOUT_STATUSES } from '@/domain/models/workout';
import { PRESCRIPTION_LIMITS } from '@/domain/rules/prescription-rules';
import { ROUTINE_LIMITS } from '@/domain/rules/routine-rules';
import { SET_LIMITS } from '@/domain/rules/workout-set-rules';

/**
 * The local database (07 §2, ADR-0010). Times are INTEGER ms since the epoch (UTC); loads are kg.
 * Any change here needs `bunx drizzle-kit generate`, and the migrations are additive (07 §6):
 * never edit one that is already merged.
 */

// ── CHECK helpers. The values come from the domain constants, never from user input. ──

function oneOf(column: AnySQLiteColumn, values: readonly string[]): SQL {
  return sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(', '))})`;
}

function between(column: AnySQLiteColumn | SQL, limits: { min: number; max: number }): SQL {
  return sql`${column} between ${sql.raw(String(limits.min))} and ${sql.raw(String(limits.max))}`;
}

/**
 * A whole number within the limits, like the domain's `isWholeBetween`: SQLite stores 2.5 in an
 * INTEGER column as a REAL, so `between` alone would accept it.
 */
function wholeBetween(column: AnySQLiteColumn, limits: { min: number; max: number }): SQL {
  return sql`typeof(${column}) = 'integer' and ${between(column, limits)}`;
}

/** Null, or a whole number within the limits. */
function nullOrWholeBetween(column: AnySQLiteColumn, limits: { min: number; max: number }): SQL {
  return sql`${column} is null or (${wholeBetween(column, limits)})`;
}

// ── Common columns of every syncable table (07 §2.1). ──

const syncColumns = {
  /** UUID generated on the client (RN-SYNC-02). */
  id: text('id').primaryKey(),
  /** Null for a guest. */
  userId: text('user_id'),
  createdAt: integer('created_at').notNull(),
  /** Client clock, monotonic per row (RN-GEN-03, see updated-at.ts). Deleting also updates it. */
  updatedAt: integer('updated_at').notNull(),
  /** Logical delete (RN-SYNC-04). */
  deletedAt: integer('deleted_at'),
  /** Set by the server trigger; the pull cursor. */
  serverUpdatedAt: integer('server_updated_at'),
  /** Pending push. Local only. */
  dirty: integer('_dirty', { mode: 'boolean' }).notNull().default(true),
  /** Why the server rejected the row (RN-SYNC-11). Local only. */
  conflict: text('_conflict'),
};

/** The prescription columns of a routine exercise, also copied into a workout exercise (RN-ENT-08). */
const prescriptionColumns = {
  role: text('role', { enum: EXERCISE_ROLES }).notNull(),
  sets: integer('sets').notNull(),
  repMin: integer('rep_min').notNull(),
  repMax: integer('rep_max').notNull(),
  restSeconds: integer('rest_seconds').notNull(),
  targetRir: integer('target_rir').notNull(),
};

type PrescriptionTable = { [K in keyof typeof prescriptionColumns]: AnySQLiteColumn };

/** RN-RUT-04 (I-03). */
function prescriptionChecks(name: string, t: PrescriptionTable) {
  const { sets, reps, restSeconds, targetRir } = PRESCRIPTION_LIMITS;
  return [
    check(`${name}_role_check`, oneOf(t.role, EXERCISE_ROLES)),
    check(`${name}_sets_check`, wholeBetween(t.sets, sets)),
    check(`${name}_rep_min_check`, wholeBetween(t.repMin, reps)),
    check(
      `${name}_rep_max_check`,
      sql`typeof(${t.repMax}) = 'integer' and ${t.repMax} between ${t.repMin} and ${sql.raw(String(reps.max))}`,
    ),
    check(
      `${name}_rest_seconds_check`,
      sql`${wholeBetween(t.restSeconds, restSeconds)} and ${t.restSeconds} % ${sql.raw(String(restSeconds.step))} = 0`,
    ),
    check(`${name}_target_rir_check`, wholeBetween(t.targetRir, targetRir)),
  ];
}

// ── User tables (07 §2.2). ──

export const profiles = sqliteTable(
  'profiles',
  {
    ...syncColumns,
    // id = user_id (RN-AUTH-06); the guest uses a fixed local id.
    level: text('level', { enum: EXPERIENCE_LEVELS }).notNull(),
    goal: text('goal', { enum: TRAINING_GOALS }).notNull(),
    daysPerWeek: integer('days_per_week').notNull(),
    unit: text('unit', { enum: LOAD_UNITS }).notNull(),
    effortMode: text('effort_mode', { enum: EFFORT_MODES }).notNull(),
    effortModeExplicit: integer('effort_mode_explicit', { mode: 'boolean' }).notNull(),
    loadIncrementsKg: text('load_increments_kg', { mode: 'json' })
      .$type<LoadIncrements>()
      .notNull(),
    loadIncrementsLb: text('load_increments_lb', { mode: 'json' })
      .$type<LoadIncrements>()
      .notNull(),
    barWeightKg: real('bar_weight_kg').notNull(),
    barWeightLb: real('bar_weight_lb').notNull(),
    /** Weak reference, without FK (RN-RUT-02). */
    activeRoutineId: text('active_routine_id'),
    onboardingCompletedAt: integer('onboarding_completed_at'),
  },
  (t) => [
    check('profiles_level_check', oneOf(t.level, EXPERIENCE_LEVELS)),
    check('profiles_goal_check', oneOf(t.goal, TRAINING_GOALS)),
    check('profiles_unit_check', oneOf(t.unit, LOAD_UNITS)),
    check('profiles_effort_mode_check', oneOf(t.effortMode, EFFORT_MODES)),
    check('profiles_days_per_week_check', wholeBetween(t.daysPerWeek, { min: 2, max: 6 })),
    // One live profile on the device (07 §2.2): the constant expression makes every live row collide.
    uniqueIndex('profiles_one_live_idx')
      .on(sql`(1)`)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const routines = sqliteTable(
  'routines',
  {
    ...syncColumns,
    name: text('name').notNull(),
    /** The template it was copied from (RN-RUT-03). */
    sourceTemplateId: text('source_template_id'),
  },
  (t) => [
    check('routines_name_check', between(sql`length(trim(${t.name}))`, ROUTINE_LIMITS.nameLength)),
  ],
);

export const routineDays = sqliteTable(
  'routine_days',
  {
    ...syncColumns,
    routineId: text('routine_id')
      .notNull()
      .references(() => routines.id),
    name: text('name').notNull(),
    /** Not compacted when a day is deleted (RN-RUT-01). */
    position: integer('position').notNull(),
  },
  (t) => [index('routine_days_routine_idx').on(t.routineId)],
);

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    ...syncColumns,
    routineDayId: text('routine_day_id')
      .notNull()
      .references(() => routineDays.id),
    /** Catalog reference without FK: it may arrive before the exercise (RN-CAT-04). */
    exerciseId: text('exercise_id').notNull(),
    position: integer('position').notNull(),
    ...prescriptionColumns,
    notes: text('notes'),
  },
  (t) => [
    index('routine_exercises_day_idx').on(t.routineDayId),
    ...prescriptionChecks('routine_exercises', t),
  ],
);

export const workouts = sqliteTable(
  'workouts',
  {
    ...syncColumns,
    /** Weak references, without FK (RN-RUT-07). */
    routineId: text('routine_id'),
    routineDayId: text('routine_day_id'),
    routineNameSnapshot: text('routine_name_snapshot').notNull(),
    dayNameSnapshot: text('day_name_snapshot').notNull(),
    status: text('status', { enum: WORKOUT_STATUSES }).notNull(),
    startedAt: integer('started_at').notNull(),
    finishedAt: integer('finished_at'),
    notes: text('notes'),
  },
  (t) => [
    check('workouts_status_check', oneOf(t.status, WORKOUT_STATUSES)),
    index('workouts_started_at_idx').on(t.startedAt),
  ],
);

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    ...syncColumns,
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id),
    /** Weak references, and catalog references without FK (RN-CAT-04). */
    routineExerciseId: text('routine_exercise_id'),
    plannedExerciseId: text('planned_exercise_id'),
    exerciseId: text('exercise_id').notNull(),
    position: integer('position').notNull(),
    status: text('status', { enum: WORKOUT_EXERCISE_STATUSES }).notNull(),
    // Copies taken when the workout starts (RN-ENT-08).
    ...prescriptionColumns,
    loadType: text('load_type', { enum: LOAD_TYPES }).notNull(),
    isUnilateral: integer('is_unilateral', { mode: 'boolean' }).notNull(),
  },
  (t) => [
    index('workout_exercises_workout_idx').on(t.workoutId),
    index('workout_exercises_exercise_idx').on(t.exerciseId),
    check('workout_exercises_status_check', oneOf(t.status, WORKOUT_EXERCISE_STATUSES)),
    check('workout_exercises_load_type_check', oneOf(t.loadType, LOAD_TYPES)),
    ...prescriptionChecks('workout_exercises', t),
  ],
);

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    ...syncColumns,
    workoutExerciseId: text('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id),
    position: integer('position').notNull(),
    /** kg, unrounded (RN-PERF-05). Null for bodyweight (I-06). */
    loadKg: real('load_kg'),
    reps: integer('reps'),
    rir: integer('rir'),
    repsLeft: integer('reps_left'),
    repsRight: integer('reps_right'),
    rirLeft: integer('rir_left'),
    rirRight: integer('rir_right'),
    isWarmup: integer('is_warmup', { mode: 'boolean' }).notNull(),
    completedAt: integer('completed_at').notNull(),
  },
  (t) => [
    index('workout_sets_workout_exercise_idx').on(t.workoutExerciseId),
    // I-05: either bilateral (reps, rir) or unilateral (per side), never both. Whether it matches
    // the exercise's is_unilateral is checked by the domain: a CHECK can't read the parent row.
    check(
      'workout_sets_laterality_check',
      sql`(${t.reps} is not null and ${t.repsLeft} is null and ${t.repsRight} is null and ${t.rirLeft} is null and ${t.rirRight} is null)
        or (${t.reps} is null and ${t.rir} is null and ${t.repsLeft} is not null and ${t.repsRight} is not null)`,
    ),
    check(
      'workout_sets_load_kg_check',
      sql`${t.loadKg} is null or ${between(t.loadKg, SET_LIMITS.loadKg)}`,
    ),
    check('workout_sets_reps_check', nullOrWholeBetween(t.reps, SET_LIMITS.reps)),
    check('workout_sets_reps_left_check', nullOrWholeBetween(t.repsLeft, SET_LIMITS.reps)),
    check('workout_sets_reps_right_check', nullOrWholeBetween(t.repsRight, SET_LIMITS.reps)),
    check('workout_sets_rir_check', nullOrWholeBetween(t.rir, SET_LIMITS.rir)),
    check('workout_sets_rir_left_check', nullOrWholeBetween(t.rirLeft, SET_LIMITS.rir)),
    check('workout_sets_rir_right_check', nullOrWholeBetween(t.rirRight, SET_LIMITS.rir)),
  ],
);

// ── Catalog tables (07 §2.3): read-only in the app, without sync columns (the pull cursor lives in
// sync_state). ──

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    aliases: text('aliases', { mode: 'json' }).$type<string[]>().notNull(),
    loadType: text('load_type', { enum: LOAD_TYPES }).notNull(),
    primaryMuscles: text('primary_muscles', { mode: 'json' }).$type<Muscle[]>().notNull(),
    secondaryMuscles: text('secondary_muscles', { mode: 'json' }).$type<Muscle[]>().notNull(),
    /** Defines the load increment (RN-PERF-06). */
    primaryEquipment: text('primary_equipment', { enum: EQUIPMENT }).notNull(),
    equipment: text('equipment', { mode: 'json' }).$type<Equipment[]>().notNull(),
    mechanic: text('mechanic', { enum: MECHANICS }).notNull(),
    isUnilateral: integer('is_unilateral', { mode: 'boolean' }).notNull(),
    description: text('description'),
    attributions: text('attributions', { mode: 'json' }).$type<ExerciseAttribution[]>().notNull(),
    /** Never deleted, only deprecated (RN-CAT-01). */
    deprecatedAt: integer('deprecated_at'),
  },
  (t) => [
    uniqueIndex('exercises_slug_idx').on(t.slug),
    check('exercises_load_type_check', oneOf(t.loadType, LOAD_TYPES)),
    check('exercises_primary_equipment_check', oneOf(t.primaryEquipment, EQUIPMENT)),
    check('exercises_mechanic_check', oneOf(t.mechanic, MECHANICS)),
  ],
);

export const routineTemplates = sqliteTable(
  'routine_templates',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    level: text('level', { enum: EXPERIENCE_LEVELS }).notNull(),
    daysPerWeek: integer('days_per_week').notNull(),
    estimatedMinutes: integer('estimated_minutes').notNull(),
    rationale: text('rationale').notNull(),
  },
  (t) => [check('routine_templates_level_check', oneOf(t.level, EXPERIENCE_LEVELS))],
);

export const templateDays = sqliteTable(
  'template_days',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => routineTemplates.id),
    name: text('name').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [index('template_days_template_idx').on(t.templateId)],
);

export const templateExercises = sqliteTable(
  'template_exercises',
  {
    id: text('id').primaryKey(),
    templateDayId: text('template_day_id')
      .notNull()
      .references(() => templateDays.id),
    /** Without FK, like every catalog reference (RN-CAT-04). */
    exerciseId: text('exercise_id').notNull(),
    position: integer('position').notNull(),
    role: text('role', { enum: EXERCISE_ROLES }).notNull(),
    sets: integer('sets').notNull(),
  },
  (t) => [
    index('template_exercises_day_idx').on(t.templateDayId),
    check('template_exercises_role_check', oneOf(t.role, EXERCISE_ROLES)),
    check('template_exercises_sets_check', wholeBetween(t.sets, PRESCRIPTION_LIMITS.sets)),
  ],
);

// ── Local-only tables (07 §2.4). ──

export const syncState = sqliteTable('sync_state', {
  tableName: text('table_name').primaryKey(),
  /** The server_updated_at and id of the last row, as the server returns them (spike #13). */
  cursor: text('cursor'),
  lastSuccessAt: integer('last_success_at'),
  restoreCompleted: integer('restore_completed', { mode: 'boolean' }).notNull().default(false),
});

export const appState = sqliteTable(
  'app_state',
  {
    /** A single row, always 1. */
    id: integer('id').primaryKey().default(1),
    /** `guest` or the user id. */
    owner: text('owner').notNull().default('guest'),
    /** A guest merge that didn't finish (07 §4.3). */
    pendingMigrationUid: text('pending_migration_uid'),
    /** Where to resume the onboarding (RF-PERF-01 AC6). */
    onboardingStep: integer('onboarding_step'),
    catalogVersion: text('catalog_version'),
    /** The notification always uses the fixed id `rest-timer` (RN-ENT-07). */
    restTimerEndsAt: integer('rest_timer_ends_at'),
    lastAccountNudgeAt: integer('last_account_nudge_at'),
    notificationPermissionAsked: integer('notification_permission_asked', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (t) => [check('app_state_single_row_check', sql`${t.id} = 1`)],
);
