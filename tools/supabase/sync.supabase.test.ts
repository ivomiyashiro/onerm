/// <reference types="node" />
/**
 * @jest-environment node
 */
// The sync engine of 07 §4.1 against local Supabase: two devices of the same user, each with its
// own SQLite database. Push and pull are called apart when the test is about one of them: the
// push already reconciles, so the pull rules only show on rows the push didn't upload (spike #13).
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { eq, getTableColumns } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { openTestDatabase } from '@/data/db/open-test-database';
import {
  appState,
  exercises,
  profiles,
  routineDays,
  routineExercises,
  routines,
  workoutExercises,
  workouts,
  workoutSets,
} from '@/data/db/schema';
import { softDelete, writeSyncRow, type SyncTable, type SyncValues } from '@/data/db/sync-writes';
import { pullCatalog, pullChanges } from '@/data/sync/pull';
import { pushChanges } from '@/data/sync/push';
import { SupabaseSyncEngine } from '@/data/sync/supabase-sync-engine';
import { isRestored, lastSyncedAt } from '@/data/sync/sync-state-table';
import { SqliteRejectedChangeRepository } from '@/data/sync/sqlite-rejected-change-repository';
import { SqliteGuestUnion } from '@/data/sync/sqlite-guest-union';
import { ManualTableChanges } from '@/data/db/table-changes';
import type { RejectedChange } from '@/domain/models/rejected-change';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:55321';

/** The local stack's keys come from the CLI: nothing key-shaped is written in the repo. */
function localKey(name: 'PUBLISHABLE_KEY' | 'SECRET_KEY'): string {
  const fromEnv =
    name === 'SECRET_KEY' ? process.env.SUPABASE_SECRET_KEY : process.env.SUPABASE_PUBLISHABLE_KEY;
  if (fromEnv) return fromEnv;
  const status = execFileSync('./node_modules/.bin/supabase', ['status', '-o', 'env'], {
    encoding: 'utf8',
  });
  const match = status.match(new RegExp(`^${name}="?([^"\\n]+)"?$`, 'm'));
  if (!match) throw new Error(`${name} not found in \`supabase status\``);
  return match[1];
}
const PUBLISHABLE_KEY = localKey('PUBLISHABLE_KEY');
const SECRET_KEY = localKey('SECRET_KEY');

const anonClient = () => createClient(URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });

async function signIn(email: string, signUp = false): Promise<SupabaseClient> {
  const client = anonClient();
  const credentials = { email, password: 'password-123' };
  const { error } = signUp
    ? await client.auth.signUp(credentials)
    : await client.auth.signInWithPassword(credentials);
  if (error) throw error;
  return client;
}

/** A device of the user: its own database, owned by the account (07 §2.4). */
function device(client: SupabaseClient, userId: string | null) {
  const { db } = openTestDatabase();
  db.insert(appState)
    .values({ owner: userId ?? 'guest' })
    .run();
  let clock = Date.now() - 60_000;
  const write = <T extends SyncTable>(table: T, values: SyncValues<T>, at = ++clock) =>
    writeSyncRow(db, table, values, { now: at, userId });
  const row = <T extends SyncTable>(table: T, id: string) =>
    db
      .select()
      .from(table as typeof routines)
      .where(eq((table as typeof routines).id, id))
      .get() as T['$inferSelect'] | undefined;

  return {
    db,
    client,
    engine: new SupabaseSyncEngine(() => db, client, '0.1.0'),
    push: () => pushChanges(db, client, userId!),
    pull: (pageSize?: number) => pullChanges(db, client, userId!, pageSize),
    write,
    row,
    tick: () => ++clock,
    delete: (table: SyncTable, id: string) =>
      softDelete(db, table, eq((table as typeof routines).id, id), ++clock),
    /** The synced columns of every user table: what must be identical across devices. */
    snapshot: () => snapshot(db),
  };
}
type Device = ReturnType<typeof device>;

const USER_TABLES = [
  profiles,
  routines,
  routineDays,
  routineExercises,
  workouts,
  workoutExercises,
  workoutSets,
];

function snapshot(db: AppDatabase) {
  return USER_TABLES.map((table) => {
    const { dirty: _d, conflict: _c, serverUpdatedAt: _s, ...synced } = getTableColumns(table);
    return db
      .select(synced)
      .from(table as typeof routines)
      .orderBy((table as typeof routines).id)
      .all();
  });
}

// ── Rows of every user table, valid on both sides unless the test says otherwise. ──

const profile = (userId: string): SyncValues<typeof profiles> => ({
  id: userId,
  level: 'novice',
  goal: 'strength',
  daysPerWeek: 3,
  unit: 'kg',
  effortMode: 'simple',
  effortModeExplicit: false,
  loadIncrementsKg: { barbell: 2.5, dumbbell: 2, machine: 5, cable: 2.5, kettlebell: 4 },
  loadIncrementsLb: { barbell: 5, dumbbell: 5, machine: 10, cable: 5, kettlebell: 9 },
  barWeightKg: 20,
  barWeightLb: 45,
  activeRoutineId: null,
  onboardingCompletedAt: Date.UTC(2026, 9, 1),
});

const routine = (id: string, name = 'Full body') => ({ id, name, sourceTemplateId: null });
const day = (id: string, routineId: string) => ({ id, routineId, name: 'Día A', position: 1 });
const prescription = {
  role: 'main',
  sets: 3,
  repMin: 6,
  repMax: 8,
  restSeconds: 120,
  targetRir: 2,
} as const;
const routineExercise = (id: string, routineDayId: string, notes: string | null = null) => ({
  id,
  routineDayId,
  exerciseId: randomUUID(),
  position: 1,
  ...prescription,
  notes,
});
const workout = (
  id: string,
  status: 'finished' | 'in_progress' = 'finished',
  finishedAt: number | null = status === 'finished' ? Date.UTC(2026, 9, 2, 11) : null,
) => ({
  id,
  routineId: null,
  routineDayId: null,
  routineNameSnapshot: 'Full body',
  dayNameSnapshot: 'Día A',
  status,
  startedAt: Date.UTC(2026, 9, 2, 10),
  finishedAt,
  notes: null,
});
const workoutExercise = (id: string, workoutId: string) =>
  ({
    id,
    workoutId,
    routineExerciseId: null,
    plannedExerciseId: null,
    exerciseId: randomUUID(),
    position: 1,
    status: 'done',
    ...prescription,
    loadType: 'external',
    isUnilateral: false,
  }) as const;
const set = (id: string, workoutExerciseId: string, reps = 8, position = 1) => ({
  id,
  workoutExerciseId,
  position,
  loadKg: 62.5,
  reps,
  rir: 2,
  repsLeft: null,
  repsRight: null,
  rirLeft: null,
  rirRight: null,
  isWarmup: false,
  completedAt: Date.UTC(2026, 9, 2, 10, 30),
});

/** A finished workout with one exercise and one set; returns their ids. */
function finishedWorkout(on: Device, status: 'finished' | 'in_progress' = 'finished') {
  const ids = { workout: randomUUID(), exercise: randomUUID(), set: randomUUID() };
  on.write(workouts, workout(ids.workout, status));
  on.write(workoutExercises, workoutExercise(ids.exercise, ids.workout));
  on.write(workoutSets, set(ids.set, ids.exercise));
  return ids;
}

describe('sync engine against Supabase (07 §4.1)', () => {
  let userId: string;
  let a: Device;
  let b: Device;

  beforeEach(async () => {
    const email = `${randomUUID()}@test.local`;
    const clientA = await signIn(email, true);
    const clientB = await signIn(email);
    userId = (await clientA.auth.getUser()).data.user!.id;
    a = device(clientA, userId);
    b = device(clientB, userId);
  });

  it('RF-SYNC-01.AC1: the push uploads every table and adopts what the server returned', async () => {
    a.write(profiles, profile(userId));
    const r = randomUUID();
    const d = randomUUID();
    const re = randomUUID();
    a.write(routines, routine(r));
    a.write(routineDays, day(d, r));
    a.write(routineExercises, routineExercise(re, d));
    const w = finishedWorkout(a);

    await a.push();

    for (const [table, id] of [
      [profiles, userId],
      [routines, r],
      [routineDays, d],
      [routineExercises, re],
      [workouts, w.workout],
      [workoutExercises, w.exercise],
      [workoutSets, w.set],
    ] as const) {
      expect(a.row(table, id)).toMatchObject({
        dirty: false,
        conflict: null,
        userId,
        serverUpdatedAt: expect.any(Number),
      });
    }
  });

  it('RF-SYNC-03 basis: a second device pulls the same data, identical (RNF-05)', async () => {
    a.write(profiles, profile(userId));
    const r = randomUUID();
    a.write(routines, routine(r));
    a.write(routineDays, day(randomUUID(), r));
    finishedWorkout(a);
    await a.push();

    await b.pull();

    expect(b.snapshot()).toEqual(a.snapshot());
  });

  it('RF-SYNC-01.AC8: a workout in progress and its children stay on the device (RN-SYNC-13)', async () => {
    const w = finishedWorkout(a, 'in_progress');

    await a.push();

    expect(a.row(workouts, w.workout)).toMatchObject({ dirty: true, conflict: null });
    expect(a.row(workoutSets, w.set)).toMatchObject({ dirty: true, conflict: null });
    await b.pull();
    expect(b.row(workouts, w.workout)).toBeUndefined();
  });

  it('RF-SYNC-01.AC5: a batch of 200 with one row the server rejects uploads the other 199 (RN-SYNC-11)', async () => {
    const r = randomUUID();
    const d = randomUUID();
    a.write(routines, routine(r));
    a.write(routineDays, day(d, r));
    const ids = Array.from({ length: 200 }, () => randomUUID());
    // 281 characters: the local database accepts it, the server's CHECK doesn't.
    ids.forEach((id, i) =>
      a.write(routineExercises, routineExercise(id, d, i === 137 ? 'x'.repeat(281) : null)),
    );

    await a.push();

    expect(a.row(routineExercises, ids[137])).toMatchObject({ dirty: true, conflict: '23514' });
    const uploaded = ids.filter((id) => a.row(routineExercises, id)?.dirty === false);
    expect(uploaded).toHaveLength(199);
  });

  it('RN-SYNC-11: the children of a rejected row are held until it is solved', async () => {
    const w = randomUUID();
    const we = randomUUID();
    // A finished workout without finish time: valid locally, rejected by the server.
    a.write(workouts, workout(w, 'finished', null));
    a.write(workoutExercises, workoutExercise(we, w));

    await a.push();

    expect(a.row(workouts, w)?.conflict).toMatch(/^23/);
    expect(a.row(workoutExercises, we)).toMatchObject({ dirty: true, conflict: null });
  });

  it('RF-SYNC-01.AC6: resending a change whose answer was lost leaves no duplicate (RNF-04)', async () => {
    const w = finishedWorkout(a);
    await a.push();
    const uploaded = a.row(workoutSets, w.set);
    // The answer never arrived: the row is still pending, exactly as it was sent.
    a.db
      .update(workoutSets)
      .set({ dirty: true, serverUpdatedAt: null })
      .where(eq(workoutSets.id, w.set))
      .run();

    await a.push();

    const { count } = await a.client
      .from('workout_sets')
      .select('*', { count: 'exact', head: true })
      .eq('id', w.set);
    expect(count).toBe(1);
    expect(a.row(workoutSets, w.set)).toMatchObject({
      ...uploaded,
      serverUpdatedAt: expect.any(Number),
    });
  });

  it('RF-SYNC-01.AC9: an edit that loses LWW takes the winning version and is not pending', async () => {
    const r = randomUUID();
    a.write(routines, routine(r, 'Original'));
    await a.push();
    await b.pull();
    // B edits first (older), A later (newer); A uploads first.
    const t = Date.now();
    b.write(routines, routine(r, 'From B'), t);
    a.write(routines, routine(r, 'From A'), t + 1_000);
    await a.push();

    await b.push();

    expect(b.row(routines, r)).toMatchObject({ name: 'From A', dirty: false });
  });

  it('RF-SYNC-05.AC2: a delete in A wins over a later pending edit in B (RN-SYNC-04)', async () => {
    const w = finishedWorkout(a);
    await a.push();
    await b.pull();
    a.delete(workoutSets, w.set);
    await a.push();
    b.write(workoutSets, set(w.set, w.exercise, 12), a.tick() + 60_000);

    await b.pull();

    expect(b.row(workoutSets, w.set)).toMatchObject({
      deletedAt: expect.any(Number),
      dirty: false,
    });
  });

  it('RN-SYNC-15: a row deleted locally does not come back with the pull', async () => {
    const w = finishedWorkout(a);
    await a.push();
    await b.pull();
    b.delete(workoutSets, w.set);
    a.write(workoutSets, set(w.set, w.exercise, 12), b.tick() + 60_000);
    await a.push();

    await b.pull();

    expect(b.row(workoutSets, w.set)?.deletedAt).not.toBeNull();
  });

  it('RF-SYNC-04.AC2: a deleted workout disappears in B with its children (RN-SYNC-12)', async () => {
    const w = finishedWorkout(a);
    await a.push();
    await b.pull();
    a.delete(workouts, w.workout);
    await a.push();

    await b.pull();

    expect(b.row(workouts, w.workout)?.deletedAt).not.toBeNull();
    expect(b.row(workoutSets, w.set)?.deletedAt).not.toBeNull();
  });

  it('RNF-05: more than 500 rows inside the same 5 s window are all pulled, once', async () => {
    const w = finishedWorkout(a);
    for (let i = 0; i < 620; i++) a.write(workoutSets, set(randomUUID(), w.exercise, 8, i + 2));
    await a.push();

    await b.pull();

    expect(b.snapshot()).toEqual(a.snapshot());
    // The cursor was saved: the next pull reads only the overlap, and still gets new rows.
    const late = randomUUID();
    a.write(workoutSets, set(late, w.exercise, 5, 999));
    await a.push();
    await b.pull();
    expect(b.row(workoutSets, late)).toBeDefined();
  });

  it('RF-SYNC-05.AC4: two devices with crossed offline edits converge (RNF-05)', async () => {
    const r = randomUUID();
    a.write(routines, routine(r, 'Base'));
    const w = finishedWorkout(a);
    const second = randomUUID();
    a.write(workoutSets, set(second, w.exercise, 6, 2));
    await a.engine.sync();
    await b.engine.sync();

    // Offline: A renames the routine and edits a set; B edits the same set later, deletes the
    // other, and adds a workout of its own (RF-SYNC-05.AC3).
    a.write(routines, routine(r, 'From A'));
    a.write(workoutSets, set(w.set, w.exercise, 9));
    b.write(workoutSets, set(w.set, w.exercise, 10), a.tick() + 1_000);
    b.delete(workoutSets, second);
    const own = finishedWorkout(b);

    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();

    expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.row(routines, r)?.name).toBe('From A');
    expect(a.row(workoutSets, w.set)?.reps).toBe(10);
    expect(a.row(workoutSets, second)?.deletedAt).not.toBeNull();
    expect(a.row(workouts, own.workout)).toBeDefined();
    const pending = (on: Device) =>
      USER_TABLES.flatMap((t) =>
        on.db
          .select()
          .from(t as typeof routines)
          .where(eq((t as typeof routines).dirty, true))
          .all(),
      );
    expect(pending(a)).toEqual([]);
    expect(pending(b)).toEqual([]);
  });

  it('RF-SYNC-06: a sync that ends well records when, and a failed one does not', async () => {
    expect(await a.engine.sync()).toBe('synced');
    expect(lastSyncedAt(a.db)).toEqual(expect.any(Date));

    const unreachable = device(
      createClient('http://127.0.0.1:9', PUBLISHABLE_KEY, { auth: { persistSession: false } }),
      userId,
    );
    expect(await unreachable.engine.sync()).toBe('failed');
    expect(lastSyncedAt(unreachable.db)).toBeNull();
  }, 60_000);

  it('RF-SYNC-06.AC4: discarding a rejected edit of an uploaded row goes back to the server version', async () => {
    const r = randomUUID();
    const d = randomUUID();
    const e = randomUUID();
    a.write(routines, routine(r));
    a.write(routineDays, day(d, r));
    a.write(routineExercises, routineExercise(e, d));
    await a.push();
    a.write(routineExercises, routineExercise(e, d, 'x'.repeat(281)));
    await a.push();
    const rejected = new SqliteRejectedChangeRepository(
      () => a.db,
      new ManualTableChanges(),
      a.client,
    );
    let changes: RejectedChange[] = [];
    rejected.observe({ next: (list) => (changes = list), error: () => {} })();
    expect(changes).toEqual([expect.objectContaining({ id: e, uploadedBefore: true })]);

    await expect(rejected.discard(changes[0])).resolves.toBe('done');

    expect(a.row(routineExercises, e)).toMatchObject({ notes: null, dirty: false, conflict: null });
  });

  it('RF-SYNC-03.AC1: a device without data restores everything, with its progress', async () => {
    const r = randomUUID();
    a.write(routines, routine(r));
    a.write(routineDays, day(randomUUID(), r));
    finishedWorkout(a);
    await a.push();
    const progress: { done: number; total: number }[] = [];

    expect(await b.engine.sync((p) => progress.push(p))).toBe('synced');

    expect(progress[0]).toEqual({ done: 0, total: 5 });
    expect(progress.at(-1)).toEqual({ done: 5, total: 5 });
    expect(isRestored(b.db)).toBe(true);
    expect(b.snapshot()).toEqual(a.snapshot());
  });

  it('RF-SYNC-03.AC2: a restoration cut short is not complete, and the next sync finishes it', async () => {
    finishedWorkout(a);
    await a.push();
    const cut = device(
      createClient('http://127.0.0.1:9', PUBLISHABLE_KEY, { auth: { persistSession: false } }),
      userId,
    );
    expect(await cut.engine.sync()).toBe('failed');
    expect(isRestored(cut.db)).toBe(false);

    await b.engine.sync();
    expect(isRestored(b.db)).toBe(true);

    // Once restored, a sync reports no progress.
    const later: unknown[] = [];
    await b.engine.sync((p) => later.push(p));
    expect(later).toEqual([]);
  }, 60_000);

  it('RN-AUTH-07: rows of another owner are never uploaded', async () => {
    const r = randomUUID();
    writeSyncRow(a.db, routines, routine(r), { now: a.tick(), userId: randomUUID() });

    await a.push();

    expect(a.row(routines, r)).toMatchObject({ dirty: true, serverUpdatedAt: null });
  });

  it('RF-SYNC-01.AC2: without a server the sync fails quietly and the change stays pending', async () => {
    const unreachable = createClient('http://127.0.0.1:9', PUBLISHABLE_KEY, {
      auth: { persistSession: false },
    });
    const offline = device(unreachable, userId);
    const r = randomUUID();
    offline.write(routines, routine(r));

    expect(await offline.engine.sync()).toBe('failed');
    expect(offline.row(routines, r)).toMatchObject({ dirty: true, conflict: null });
  }, 60_000);

  it('without the session of the owner nothing of the user goes up', async () => {
    const offline = device(anonClient(), userId);
    const r = randomUUID();
    offline.write(routines, routine(r));

    expect(await offline.engine.sync()).toBe('sessionExpired');
    expect(offline.row(routines, r)).toMatchObject({ dirty: true, conflict: null });
  });
});

describe('catalog pull (RF-CAT-04, RN-SYNC-09)', () => {
  const service = createClient(URL, SECRET_KEY, { auth: { persistSession: false } });

  it('RF-CAT-04.AC1: a guest downloads a new exercise without a session or user data (RF-SYNC-01.AC7)', async () => {
    const id = randomUUID();
    const { error } = await service.from('exercises').insert({
      id,
      slug: `sync-test-${id.slice(0, 8)}`,
      name: 'Remo invertido',
      load_type: 'bodyweight',
      primary_muscles: ['lats'],
      primary_equipment: 'bodyweight',
      equipment: ['bodyweight'],
      mechanic: 'compound',
      is_unilateral: false,
    });
    expect(error).toBeNull();
    const guest = device(anonClient(), null);

    expect(await guest.engine.sync()).toBe('guest');

    const pulled = guest.db.select().from(exercises).where(eq(exercises.id, id)).get();
    expect(pulled).toMatchObject({
      name: 'Remo invertido',
      primaryMuscles: ['lats'],
      deprecatedAt: null,
    });
  });

  it('RF-CAT-04.AC1: a later pull gets an exercise published after the first one', async () => {
    const guest = device(anonClient(), null);
    await pullCatalog(guest.db, anonClient());
    const before = guest.db.select().from(exercises).all().length;

    const id = randomUUID();
    await service.from('exercises').insert({
      id,
      slug: `sync-test-${id.slice(0, 8)}`,
      name: 'Dominadas lastradas',
      load_type: 'external',
      primary_muscles: ['lats'],
      primary_equipment: 'bodyweight',
      equipment: ['bodyweight'],
      mechanic: 'compound',
      is_unilateral: false,
    });
    await pullCatalog(guest.db, anonClient());

    expect(guest.db.select().from(exercises).all()).toHaveLength(before + 1);
  });
});

describe('guest union (RF-AUTH-05, 07 §4.3)', () => {
  let userId: string;
  let account: Device;
  let guest: Device;
  let union: SqliteGuestUnion;

  beforeEach(async () => {
    const email = `${randomUUID()}@test.local`;
    const clientA = await signIn(email, true);
    userId = (await clientA.auth.getUser()).data.user!.id;
    account = device(clientA, userId);
    // The guest's phone, already signed in to the same account (07 §4.3 step 0).
    const clientG = await signIn(email);
    guest = device(clientG, null);
    union = new SqliteGuestUnion(() => guest.db, clientG);
  });

  const rows = <T extends SyncTable>(on: Device, table: T) =>
    on.db
      .select()
      .from(table as typeof routines)
      .all() as unknown as T['$inferSelect'][];

  it('step 1: tells whether the account has data (RN-AUTH-05)', async () => {
    await expect(union.accountHasData(userId)).resolves.toBe(false);

    account.write(routines, routine(randomUUID()));
    await account.push();

    await expect(union.accountHasData(userId)).resolves.toBe(true);
  });

  it('AC3: «Sumar» adds the guest data to the account: no row duplicated or lost on any device', async () => {
    account.write(profiles, { ...profile(userId), daysPerWeek: 5 });
    const accountRoutine = randomUUID();
    account.write(routines, routine(accountRoutine, 'De la cuenta'));
    const accountWorkout = finishedWorkout(account);
    await account.push();

    guest.write(profiles, { ...profile('guest'), daysPerWeek: 2 });
    const guestRoutine = randomUUID();
    guest.write(routines, routine(guestRoutine, 'Del invitado'));
    guest.write(routineDays, day(randomUUID(), guestRoutine));
    const guestWorkout = finishedWorkout(guest);
    const inProgress = finishedWorkout(guest, 'in_progress');

    await expect(union.unite({ userId, email: null, keepGuestData: true })).resolves.toBe('done');
    // The account's profile wins (RN-AUTH-04); the guest's is gone.
    expect(rows(guest, profiles)).toEqual([
      expect.objectContaining({ id: userId, daysPerWeek: 5, dirty: false }),
    ]);
    expect(await guest.engine.sync()).toBe('synced');
    await account.engine.sync();

    for (const on of [guest, account]) {
      expect(
        rows(on, routines)
          .map((r) => r.name)
          .sort(),
      ).toEqual(['De la cuenta', 'Del invitado']);
      expect(
        rows(on, workouts)
          .filter((w) => w.status === 'finished')
          .map((w) => w.id)
          .sort(),
      ).toEqual([accountWorkout.workout, guestWorkout.workout].sort());
    }
    // AC8: the workout in progress stays on the guest's phone, the account's now, not uploaded.
    expect(guest.row(workouts, inProgress.workout)).toMatchObject({ userId, dirty: true });
    expect(account.row(workouts, inProgress.workout)).toBeUndefined();
    const { count } = await guest.client
      .from('routines')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    expect(count).toBe(2);
  });

  it('AC7: an account without data takes the guest profile too (RN-AUTH-06)', async () => {
    guest.write(profiles, { ...profile('guest'), daysPerWeek: 4 });
    guest.write(routines, routine(randomUUID()));

    await union.unite({ userId, email: 'ana@mail.com', keepGuestData: true });
    await guest.engine.sync();

    expect(rows(guest, profiles)).toEqual([
      expect.objectContaining({ id: userId, userId, daysPerWeek: 4, dirty: false }),
    ]);
    const { data } = await guest.client.from('profiles').select('days_per_week').single();
    expect(data).toEqual({ days_per_week: 4 });
  });

  it("RN-AUTH-04: the account without an active routine takes the guest's", async () => {
    account.write(profiles, profile(userId));
    await account.push();
    const guestRoutine = randomUUID();
    guest.write(routines, routine(guestRoutine));
    guest.write(profiles, { ...profile('guest'), activeRoutineId: guestRoutine });

    await union.unite({ userId, email: null, keepGuestData: true });

    expect(rows(guest, profiles)[0]).toMatchObject({ activeRoutineId: guestRoutine, dirty: true });
  });

  it('AC4: «Descartar» deletes the guest data, the workout in progress too, and keeps the account', async () => {
    account.write(routines, routine(randomUUID(), 'De la cuenta'));
    await account.push();
    guest.write(routines, routine(randomUUID(), 'Del invitado'));
    finishedWorkout(guest, 'in_progress');

    await union.unite({ userId, email: null, keepGuestData: false });
    await guest.engine.sync();

    expect(rows(guest, routines).map((r) => r.name)).toEqual(['De la cuenta']);
    expect(rows(guest, workouts)).toEqual([]);
  });
});
