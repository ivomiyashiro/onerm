import { openTestDatabase, type TestDatabase } from './open-test-database';
import {
  appState,
  exercises,
  profiles,
  routineDays,
  routineExercises,
  routineTemplates,
  routines,
  syncState,
  templateDays,
  templateExercises,
  workoutExercises,
  workouts,
  workoutSets,
} from './schema';

const NOW = 1_780_000_000_000;
const sync = { createdAt: NOW, updatedAt: NOW };
const CHECK_FAILED = /CHECK constraint failed/;

const INCREMENTS_KG = { barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 5, kettlebell: 4 };
const INCREMENTS_LB = { barbell: 5, dumbbell: 5, cable: 5, machine: 10, kettlebell: 10 };

const profile = (overrides: Partial<typeof profiles.$inferInsert> = {}) => ({
  ...sync,
  id: 'guest',
  level: 'novice' as const,
  goal: 'health' as const,
  daysPerWeek: 3,
  unit: 'kg' as const,
  effortMode: 'simple' as const,
  effortModeExplicit: false,
  loadIncrementsKg: INCREMENTS_KG,
  loadIncrementsLb: INCREMENTS_LB,
  barWeightKg: 20,
  barWeightLb: 45,
  ...overrides,
});

const routineExercise = (overrides: Partial<typeof routineExercises.$inferInsert> = {}) => ({
  ...sync,
  id: 're1',
  routineDayId: 'd1',
  exerciseId: 'barbell-back-squat',
  position: 1,
  role: 'main' as const,
  sets: 3,
  repMin: 6,
  repMax: 10,
  restSeconds: 120,
  targetRir: 2,
  ...overrides,
});

const workoutExercise = (overrides: Partial<typeof workoutExercises.$inferInsert> = {}) => ({
  ...sync,
  id: 'we1',
  workoutId: 'w1',
  exerciseId: 'barbell-back-squat',
  position: 1,
  status: 'pending' as const,
  role: 'main' as const,
  sets: 3,
  repMin: 6,
  repMax: 10,
  restSeconds: 120,
  targetRir: 2,
  loadType: 'external' as const,
  isUnilateral: false,
  ...overrides,
});

const bilateralSet = (overrides: Partial<typeof workoutSets.$inferInsert> = {}) => ({
  ...sync,
  id: 's1',
  workoutExerciseId: 'we1',
  position: 1,
  loadKg: 60,
  reps: 8,
  rir: 2,
  isWarmup: false,
  completedAt: NOW,
  ...overrides,
});

const unilateralSet = (overrides: Partial<typeof workoutSets.$inferInsert> = {}) => ({
  ...sync,
  id: 's1',
  workoutExerciseId: 'we1',
  position: 1,
  loadKg: 20,
  repsLeft: 10,
  repsRight: 9,
  rirLeft: 2,
  rirRight: 1,
  isWarmup: false,
  completedAt: NOW,
  ...overrides,
});

let t: TestDatabase;

beforeEach(() => {
  t = openTestDatabase();
});

afterEach(() => {
  t.sqlite.close();
});

function insertRoutineDay() {
  t.db
    .insert(routines)
    .values({ ...sync, id: 'r1', name: 'Full body' })
    .run();
  t.db
    .insert(routineDays)
    .values({ ...sync, id: 'd1', routineId: 'r1', name: 'A', position: 1 })
    .run();
}

function insertWorkout() {
  t.db
    .insert(workouts)
    .values({
      ...sync,
      id: 'w1',
      routineNameSnapshot: 'Full body',
      dayNameSnapshot: 'A',
      status: 'in_progress',
      startedAt: NOW,
    })
    .run();
}

function columns(table: string): string[] {
  return (t.sqlite.pragma(`table_info(${table})`) as { name: string }[]).map((c) => c.name);
}

describe('local schema (07 §2)', () => {
  const USER_TABLES = [
    'profiles',
    'routines',
    'routine_days',
    'routine_exercises',
    'workouts',
    'workout_exercises',
    'workout_sets',
  ];

  it('the migrations create every table of 07 §2.2–2.4', () => {
    const tables = (
      t.sqlite
        .prepare(
          "select name from sqlite_master where type = 'table' and name not like '\\_\\_%' escape '\\' and name not like 'sqlite%'",
        )
        .all() as { name: string }[]
    ).map((row) => row.name);

    expect(tables.sort()).toEqual(
      [
        ...USER_TABLES,
        'exercises',
        'routine_templates',
        'template_days',
        'template_exercises',
        'sync_state',
        'app_state',
      ].sort(),
    );
  });

  it.each(USER_TABLES)('%s has the common sync columns (07 §2.1)', (table) => {
    expect(columns(table)).toEqual(
      expect.arrayContaining([
        'id',
        'user_id',
        'created_at',
        'updated_at',
        'deleted_at',
        'server_updated_at',
        '_dirty',
        '_conflict',
      ]),
    );
  });

  it('a new row starts pending push and without conflict', () => {
    insertWorkout();
    expect(t.db.select().from(workouts).get()).toMatchObject({
      dirty: true,
      conflict: null,
      deletedAt: null,
      serverUpdatedAt: null,
      userId: null,
    });
  });
});

describe('profiles', () => {
  it('round-trips the increment maps as JSON', () => {
    t.db.insert(profiles).values(profile()).run();
    expect(t.db.select().from(profiles).get()).toMatchObject({
      loadIncrementsKg: INCREMENTS_KG,
      loadIncrementsLb: INCREMENTS_LB,
      effortModeExplicit: false,
      activeRoutineId: null,
    });
  });

  it.each([
    ['level', { level: 'expert' }],
    ['goal', { goal: 'power' }],
    ['unit', { unit: 'oz' }],
    ['effort_mode', { effortMode: 'rpe' }],
    ['days_per_week below 2', { daysPerWeek: 1 }],
    ['days_per_week above 6', { daysPerWeek: 7 }],
  ])('rejects an invalid %s', (_, overrides) => {
    expect(() =>
      t.db
        .insert(profiles)
        .values(profile(overrides as Partial<typeof profiles.$inferInsert>))
        .run(),
    ).toThrow(CHECK_FAILED);
  });

  it.each([2, 6])('accepts %i days per week', (daysPerWeek) => {
    t.db.insert(profiles).values(profile({ daysPerWeek })).run();
    expect(t.db.select().from(profiles).all()).toHaveLength(1);
  });

  it('keeps one live profile: a second live row is rejected', () => {
    t.db
      .insert(profiles)
      .values(profile({ id: 'guest' }))
      .run();
    expect(() =>
      t.db
        .insert(profiles)
        .values(profile({ id: 'u1', userId: 'u1' }))
        .run(),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('a deleted profile does not count as the live one', () => {
    t.db
      .insert(profiles)
      .values(profile({ id: 'guest', deletedAt: NOW }))
      .run();
    t.db
      .insert(profiles)
      .values(profile({ id: 'u1', userId: 'u1' }))
      .run();
    expect(t.db.select().from(profiles).all()).toHaveLength(2);
  });

  it('active_routine_id is a weak reference, without FK (RN-RUT-02)', () => {
    t.db
      .insert(profiles)
      .values(profile({ activeRoutineId: 'missing' }))
      .run();
    expect(t.db.select().from(profiles).get()?.activeRoutineId).toBe('missing');
  });
});

describe('routines', () => {
  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['51 characters', 'x'.repeat(51)],
  ])('rejects a name that is %s (RN-RUT-05)', (_, name) => {
    expect(() =>
      t.db
        .insert(routines)
        .values({ ...sync, id: 'r1', name })
        .run(),
    ).toThrow(CHECK_FAILED);
  });

  it('accepts a 50-character name', () => {
    t.db
      .insert(routines)
      .values({ ...sync, id: 'r1', name: 'á'.repeat(50) })
      .run();
    expect(t.db.select().from(routines).all()).toHaveLength(1);
  });

  it('a day needs its routine (FK)', () => {
    expect(() =>
      t.db
        .insert(routineDays)
        .values({ ...sync, id: 'd1', routineId: 'r1', name: 'A', position: 1 })
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it('an exercise needs its day (FK), but not a catalog entry (RN-CAT-04)', () => {
    expect(() => t.db.insert(routineExercises).values(routineExercise()).run()).toThrow(
      /FOREIGN KEY constraint failed/,
    );
    insertRoutineDay();
    t.db
      .insert(routineExercises)
      .values(routineExercise({ exerciseId: 'not-in-catalog' }))
      .run();
    expect(t.db.select().from(routineExercises).all()).toHaveLength(1);
  });
});

// RN-RUT-04, also on the copy of the prescription in workout_exercises (I-03).
const INVALID_PRESCRIPTIONS = [
  ['0 sets', { sets: 0 }],
  ['11 sets', { sets: 11 }],
  ['a rep floor of 0', { repMin: 0, repMax: 10 }],
  ['a rep floor of 31', { repMin: 31, repMax: 31 }],
  ['a cap below the floor', { repMin: 8, repMax: 7 }],
  ['a cap of 31', { repMin: 8, repMax: 31 }],
  ['a rest of 15 s', { restSeconds: 15 }],
  ['a rest of 615 s', { restSeconds: 615 }],
  ['a rest off the 15 s step', { restSeconds: 100 }],
  ['a target RIR of -1', { targetRir: -1 }],
  ['a target RIR of 6', { targetRir: 6 }],
  ['an unknown role', { role: 'warmup' }],
  ['fractional sets', { sets: 2.5 }],
  ['a fractional rep floor', { repMin: 6.5 }],
  ['a fractional target RIR', { targetRir: 1.5 }],
] as const;

const LIMIT_PRESCRIPTIONS = [
  ['the lower limits', { sets: 1, repMin: 1, repMax: 1, restSeconds: 30, targetRir: 0 }],
  ['the upper limits', { sets: 10, repMin: 30, repMax: 30, restSeconds: 600, targetRir: 5 }],
] as const;

describe('routine_exercises (RN-RUT-04)', () => {
  beforeEach(insertRoutineDay);

  it.each(INVALID_PRESCRIPTIONS)('rejects %s', (_, overrides) => {
    expect(() =>
      t.db
        .insert(routineExercises)
        .values(routineExercise(overrides as Partial<typeof routineExercises.$inferInsert>))
        .run(),
    ).toThrow(CHECK_FAILED);
  });

  it.each(LIMIT_PRESCRIPTIONS)('accepts %s', (_, overrides) => {
    t.db.insert(routineExercises).values(routineExercise(overrides)).run();
    expect(t.db.select().from(routineExercises).all()).toHaveLength(1);
  });
});

describe('workouts', () => {
  it('rejects a status other than in_progress or finished (06 §3)', () => {
    expect(() =>
      t.db
        .insert(workouts)
        .values({
          ...sync,
          id: 'w1',
          routineNameSnapshot: 'Full body',
          dayNameSnapshot: 'A',
          status: 'discarded' as 'finished',
          startedAt: NOW,
        })
        .run(),
    ).toThrow(CHECK_FAILED);
  });

  it('routine and day are weak references, without FK (RN-RUT-07)', () => {
    t.db
      .insert(workouts)
      .values({
        ...sync,
        id: 'w1',
        routineId: 'gone',
        routineDayId: 'gone',
        routineNameSnapshot: 'Full body',
        dayNameSnapshot: 'A',
        status: 'finished',
        startedAt: NOW,
        finishedAt: NOW,
      })
      .run();
    expect(t.db.select().from(workouts).all()).toHaveLength(1);
  });
});

describe('workout_exercises', () => {
  beforeEach(insertWorkout);

  it('needs its workout (FK)', () => {
    expect(() =>
      t.db
        .insert(workoutExercises)
        .values(workoutExercise({ workoutId: 'x' }))
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it.each<readonly [string, object]>([
    ['status', { status: 'abandoned' }],
    ['load type', { loadType: 'assisted' }],
    ...INVALID_PRESCRIPTIONS,
  ])('rejects an invalid %s', (_, overrides) => {
    expect(() =>
      t.db
        .insert(workoutExercises)
        .values(workoutExercise(overrides as Partial<typeof workoutExercises.$inferInsert>))
        .run(),
    ).toThrow(CHECK_FAILED);
  });

  it('keeps the planned and the done exercise without FK to the catalog (RN-CAT-04)', () => {
    t.db
      .insert(workoutExercises)
      .values(
        workoutExercise({ plannedExerciseId: 'a', exerciseId: 'b', routineExerciseId: 'gone' }),
      )
      .run();
    expect(t.db.select().from(workoutExercises).all()).toHaveLength(1);
  });
});

describe('workout_sets', () => {
  beforeEach(() => {
    insertWorkout();
    t.db.insert(workoutExercises).values(workoutExercise()).run();
  });

  it.each([
    ['a bilateral set', bilateralSet()],
    ['a bilateral set without RIR', bilateralSet({ rir: null })],
    ['a bodyweight set without load', bilateralSet({ loadKg: null })],
    ['a unilateral set', unilateralSet()],
    ['a unilateral set without RIR', unilateralSet({ rirLeft: null, rirRight: null })],
    ['the limits', bilateralSet({ loadKg: 1000, reps: 100, rir: 5 })],
    ['zeros', bilateralSet({ loadKg: 0, reps: 0, rir: 0 })],
  ])('accepts %s', (_, set) => {
    t.db.insert(workoutSets).values(set).run();
    expect(t.db.select().from(workoutSets).all()).toHaveLength(1);
  });

  it.each([
    ['a bilateral set with side reps (I-05)', bilateralSet({ repsLeft: 8 })],
    ['a bilateral set with side RIR (I-05)', bilateralSet({ rirRight: 1 })],
    ['a unilateral set with total reps (I-05)', unilateralSet({ reps: 8 })],
    ['a unilateral set with total RIR (I-05)', unilateralSet({ rir: 1 })],
    ['a unilateral set with one side only (I-05)', unilateralSet({ repsRight: null })],
    ['a set without reps (I-05)', bilateralSet({ reps: null })],
    ['a load above 1000 kg', bilateralSet({ loadKg: 1000.01 })],
    ['a negative load', bilateralSet({ loadKg: -1 })],
    ['101 reps', bilateralSet({ reps: 101 })],
    ['negative reps', bilateralSet({ reps: -1 })],
    ['a RIR of 6', bilateralSet({ rir: 6 })],
    ['101 reps on the left', unilateralSet({ repsLeft: 101 })],
    ['a RIR of 6 on the right', unilateralSet({ rirRight: 6 })],
    ['fractional reps', bilateralSet({ reps: 7.5 })],
    ['a fractional RIR', bilateralSet({ rir: 1.5 })],
    ['fractional reps on the left', unilateralSet({ repsLeft: 7.5 })],
  ])('rejects %s', (_, set) => {
    expect(() => t.db.insert(workoutSets).values(set).run()).toThrow(CHECK_FAILED);
  });

  it('needs its workout exercise (FK)', () => {
    expect(() =>
      t.db
        .insert(workoutSets)
        .values(bilateralSet({ workoutExerciseId: 'x' }))
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });
});

describe('catalog tables (07 §2.3)', () => {
  const exercise = {
    id: 'barbell-back-squat',
    slug: 'sentadilla-barra',
    name: 'Sentadilla con barra',
    aliases: ['Back squat'],
    loadType: 'external' as const,
    primaryMuscles: ['quads' as const],
    secondaryMuscles: ['glutes' as const],
    primaryEquipment: 'barbell' as const,
    equipment: ['barbell' as const],
    mechanic: 'compound' as const,
    isUnilateral: false,
    description: null,
    attributions: [{ source: 'wger', license: 'CC-BY-SA 4.0', attribution: 'wger.de' }],
    deprecatedAt: null,
  };

  it('round-trips an exercise with its lists as JSON', () => {
    t.db.insert(exercises).values(exercise).run();
    expect(t.db.select().from(exercises).get()).toEqual(exercise);
  });

  it.each([
    ['load type', { loadType: 'assisted' }],
    ['primary equipment', { primaryEquipment: 'band' }],
    ['mechanic', { mechanic: 'hinge' }],
  ])('rejects an unknown %s (RN-CAT-03)', (_, overrides) => {
    expect(() =>
      t.db
        .insert(exercises)
        .values({ ...exercise, ...(overrides as object) })
        .run(),
    ).toThrow(CHECK_FAILED);
  });

  it('the slug is unique', () => {
    t.db.insert(exercises).values(exercise).run();
    expect(() =>
      t.db
        .insert(exercises)
        .values({ ...exercise, id: 'other' })
        .run(),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('stores a template with its days and exercises', () => {
    t.db
      .insert(routineTemplates)
      .values({
        id: 'PLT-FB3',
        name: 'Full body 3 días',
        level: 'novice',
        daysPerWeek: 3,
        estimatedMinutes: 60,
        rationale: 'P-01',
      })
      .run();
    t.db
      .insert(templateDays)
      .values({ id: 'PLT-FB3-A', templateId: 'PLT-FB3', name: 'A', position: 1 })
      .run();
    t.db
      .insert(templateExercises)
      .values({
        id: 'PLT-FB3-A-1',
        templateDayId: 'PLT-FB3-A',
        exerciseId: 'barbell-back-squat',
        position: 1,
        role: 'main',
        sets: 3,
      })
      .run();
    expect(t.db.select().from(templateExercises).all()).toHaveLength(1);
    expect(() =>
      t.db
        .insert(templateDays)
        .values({ id: 'x', templateId: 'missing', name: 'B', position: 2 })
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });
});

describe('local-only tables (07 §2.4)', () => {
  it('sync_state keeps one cursor per table, as text (spike #13)', () => {
    t.db
      .insert(syncState)
      .values({ tableName: 'workouts', cursor: '2026-10-06T12:00:00.123456+00:00|w1' })
      .run();
    expect(t.db.select().from(syncState).get()).toEqual({
      tableName: 'workouts',
      cursor: '2026-10-06T12:00:00.123456+00:00|w1',
      lastSuccessAt: null,
      restoreCompleted: false,
    });
    expect(() => t.db.insert(syncState).values({ tableName: 'workouts' }).run()).toThrow(
      /UNIQUE constraint failed/,
    );
  });

  it('app_state has a single row that starts as a guest', () => {
    t.db.insert(appState).values({}).run();
    expect(t.db.select().from(appState).get()).toEqual({
      id: 1,
      owner: 'guest',
      pendingMigrationUid: null,
      onboardingStep: null,
      catalogVersion: null,
      restTimerEndsAt: null,
      lastAccountNudgeAt: null,
      notificationPermissionAsked: false,
    });
    expect(() => t.db.insert(appState).values({ id: 2 }).run()).toThrow(CHECK_FAILED);
  });
});
