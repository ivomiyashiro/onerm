import { count, eq } from 'drizzle-orm';

import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import { appState, exercises, profiles, syncState, workouts } from '@/data/db/schema';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SqliteAccountRepository } from '@/data/repositories/sqlite-account-repository';
import { SqliteProfileRepository } from '@/data/repositories/sqlite-profile-repository';
import { SqliteRoutineRepository } from '@/data/repositories/sqlite-routine-repository';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite-workout-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aBilateralSet,
  anExercise,
  aRoutine,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';

let t: TestDatabase;
let account: SqliteAccountRepository;
let workoutRepository: SqliteWorkoutRepository;
let routineRepository: SqliteRoutineRepository;
let profileRepository: SqliteProfileRepository;

beforeEach(() => {
  t = openTestDatabase();
  const changes = new ManualTableChanges();
  account = new SqliteAccountRepository(() => t.db);
  workoutRepository = new SqliteWorkoutRepository(
    () => t.db,
    changes,
    () => 1_780_000_000_000,
  );
  routineRepository = new SqliteRoutineRepository(
    () => t.db,
    changes,
    () => 1_780_000_000_000,
  );
  profileRepository = new SqliteProfileRepository(
    () => t.db,
    changes,
    () => 1_780_000_000_000,
  );
});

afterEach(() => {
  t.sqlite.close();
});

const finished = (id: string) =>
  aWorkout({
    id,
    status: 'finished',
    finishedAt: new Date('2026-10-05T12:00:00Z'),
    exercises: [
      aWorkoutExercise({
        id: `${id}-e`,
        workoutId: id,
        sets: [aBilateralSet({ id: `${id}-s`, workoutExerciseId: `${id}-e` })],
      }),
    ],
  });

describe('SqliteAccountRepository', () => {
  it('starts as a guest, also without the app_state row', async () => {
    await expect(account.readOwner()).resolves.toEqual({ kind: 'guest' });
  });

  it('saves the owner and reads it back', async () => {
    await account.saveOwner({ kind: 'user', userId: 'u1' });
    await expect(account.readOwner()).resolves.toEqual({ kind: 'user', userId: 'u1' });

    await account.saveOwner({ kind: 'guest' });
    await expect(account.readOwner()).resolves.toEqual({ kind: 'guest' });
  });

  it('RN-SYNC-08: counts the pending rows of finished data, not the workout in progress', async () => {
    await expect(account.countPendingChanges()).resolves.toBe(0);

    await workoutRepository.save(finished('w1')); // workout + exercise + set
    await routineRepository.save(aRoutine());
    const routineRows = await account.countPendingChanges();
    expect(routineRows).toBeGreaterThan(3);

    await workoutRepository.save(aWorkout({ id: 'w2', status: 'in_progress' }));
    await expect(account.countPendingChanges()).resolves.toBe(routineRows);
  });

  it('RF-AUTH-07.AC4: knows when a workout is in progress', async () => {
    await expect(account.hasWorkoutInProgress()).resolves.toBe(false);

    await workoutRepository.save(aWorkout({ id: 'w2', status: 'in_progress' }));

    await expect(account.hasWorkoutInProgress()).resolves.toBe(true);
  });

  it('07 §4.4: clearing removes the user data and the sync state, and keeps the catalog', async () => {
    const exercise = anExercise();
    t.db
      .insert(exercises)
      .values({
        ...exercise,
        aliases: [...exercise.aliases],
        primaryMuscles: [...exercise.primaryMuscles],
        secondaryMuscles: [...exercise.secondaryMuscles],
        equipment: [...exercise.equipment],
        attributions: [...exercise.attributions],
        deprecatedAt: null,
      })
      .run();
    t.db.insert(syncState).values({ tableName: 'routines', cursor: 'c' }).run();
    await profileRepository.save(defaultProfile());
    await routineRepository.save(aRoutine());
    await workoutRepository.save(finished('w1'));
    await account.saveOwner({ kind: 'user', userId: 'u1' });
    t.db
      .update(appState)
      .set({ catalogVersion: '3', onboardingStep: 2, notificationPermissionAsked: true })
      .run();

    await account.clearUserData();

    const rows = (table: typeof profiles | typeof workouts | typeof syncState | typeof exercises) =>
      t.db.select({ n: count() }).from(table).get()?.n;
    expect([rows(profiles), rows(workouts), rows(syncState)]).toEqual([0, 0, 0]);
    expect(rows(exercises)).toBe(1);
    expect(t.db.select().from(appState).where(eq(appState.id, 1)).get()).toMatchObject({
      owner: 'guest',
      onboardingStep: null,
      catalogVersion: '3',
      notificationPermissionAsked: true,
    });
    await expect(account.readOwner()).resolves.toEqual({ kind: 'guest' });
  });
});
