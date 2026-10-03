/**
 * SPIKE #13: minimal push/pull against local Supabase, with two devices of the same user.
 */
import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

import { workoutSets, workouts } from '@/data/db/schema';
import { openTestDb } from '@/data/db/test-db';
import { type Cursors, nextUpdatedAt, pullAll, pushAll, sync } from '@/data/sync/spike-sync';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:55321';
const KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

async function signIn(email: string, signUp = false): Promise<SupabaseClient> {
  const client = createClient(URL, KEY, { auth: { persistSession: false } });
  const credentials = { email, password: 'password-123' };
  const { error } = signUp
    ? await client.auth.signUp(credentials)
    : await client.auth.signInWithPassword(credentials);
  if (error) throw error;
  return client;
}

type Device = ReturnType<typeof device>;
function device(client: SupabaseClient) {
  const db = openTestDb();
  const cursors: Cursors = new Map();
  return {
    db,
    client,
    sync: (opts?: { pageSize?: number }) => sync(db, client, cursors, opts),
    push: () => pushAll(db, client),
    pull: () => pullAll(db, client, cursors),
    addWorkout(id: string, at: number, status: 'finished' | 'in_progress' = 'finished') {
      db.insert(workouts)
        .values({
          id,
          createdAt: at,
          updatedAt: at,
          routineNameSnapshot: 'Full body',
          status,
          startedAt: at,
        })
        .run();
    },
    addSet(id: string, workoutId: string, at: number, reps = 8) {
      db.insert(workoutSets)
        .values({ id, workoutId, createdAt: at, updatedAt: at, position: 1, loadKg: 62.5, reps })
        .run();
    },
    renameWorkout(id: string, name: string, at: number) {
      const w = db.select().from(workouts).where(eq(workouts.id, id)).get()!;
      db.update(workouts)
        .set({ routineNameSnapshot: name, updatedAt: nextUpdatedAt(w.updatedAt, at), dirty: true })
        .where(eq(workouts.id, id))
        .run();
    },
    setReps(id: string, reps: number, at: number) {
      const s = db.select().from(workoutSets).where(eq(workoutSets.id, id)).get()!;
      db.update(workoutSets)
        .set({ reps, updatedAt: nextUpdatedAt(s.updatedAt, at), dirty: true })
        .where(eq(workoutSets.id, id))
        .run();
    },
    deleteSet(id: string, at: number) {
      const s = db.select().from(workoutSets).where(eq(workoutSets.id, id)).get()!;
      const updatedAt = nextUpdatedAt(s.updatedAt, at);
      db.update(workoutSets)
        .set({ deletedAt: updatedAt, updatedAt, dirty: true })
        .where(eq(workoutSets.id, id))
        .run();
    },
    workout: (id: string) => db.select().from(workouts).where(eq(workouts.id, id)).get(),
    set: (id: string) => db.select().from(workoutSets).where(eq(workoutSets.id, id)).get(),
    /** Synced columns only: what has to be identical across devices. */
    snapshot() {
      const strip = <
        T extends { dirty: boolean; conflict: string | null; serverUpdatedAt: number | null },
      >(
        rows: T[],
      ) => rows.map(({ dirty: _d, conflict: _c, serverUpdatedAt: _s, ...rest }) => rest);
      return {
        workouts: strip(db.select().from(workouts).orderBy(workouts.id).all()),
        sets: strip(db.select().from(workoutSets).orderBy(workoutSets.id).all()),
      };
    },
  };
}

describe('spike #13 · push and pull', () => {
  let email: string;
  let a: Device;
  let b: Device;
  const t0 = Date.now() - 60_000;

  beforeEach(async () => {
    email = `${randomUUID()}@test.local`;
    a = device(await signIn(email, true));
    b = device(await signIn(email));
  });

  it('push adopts the returned row and clears _dirty', async () => {
    const w = randomUUID();
    a.addWorkout(w, t0);
    const stats = await a.push();
    expect(stats.pushed).toBe(1);
    expect(a.workout(w)).toMatchObject({ dirty: false, serverUpdatedAt: expect.any(Number) });
    expect(a.workout(w)!.userId).toEqual(expect.any(String));
  });

  it('in-progress workouts and their sets are not pushed (RN-SYNC-13)', async () => {
    const w = randomUUID();
    a.addWorkout(w, t0, 'in_progress');
    a.addSet(randomUUID(), w, t0);
    const stats = await a.sync();
    expect(stats).toMatchObject({ pushed: 0, rejected: 0 });
    expect(a.workout(w)).toMatchObject({ dirty: true, conflict: null });
  });

  it('keyset pull with small pages loses and repeats nothing', async () => {
    const ids = Array.from({ length: 20 }, () => randomUUID());
    ids.forEach((id, i) => a.addWorkout(id, t0 + i));
    await a.sync();
    const stats = await b.sync({ pageSize: 7 });
    expect(stats.pulled).toBe(20);
    expect(b.snapshot()).toEqual(a.snapshot());
  });

  it('pulls more than 500 rows written within the same 5 s window (RNF-05)', async () => {
    for (let i = 0; i < 620; i++) a.addWorkout(randomUUID(), t0 + i);
    let started = performance.now();
    await a.sync();
    const pushMs = performance.now() - started;
    started = performance.now();
    const stats = await b.sync();
    const pullMs = performance.now() - started;
    console.log(`620 rows: push ${pushMs.toFixed(0)} ms, pull ${pullMs.toFixed(0)} ms`);
    expect(stats.pulled).toBe(620);
    expect(b.snapshot()).toEqual(a.snapshot());
  });

  it('resending the same batch does not duplicate (RNF-04)', async () => {
    const w = randomUUID();
    a.addWorkout(w, t0);
    a.addSet(randomUUID(), w, t0);
    await a.sync();
    // Simulate a lost response: the same rows go out again.
    a.db.update(workouts).set({ dirty: true }).run();
    a.db.update(workoutSets).set({ dirty: true }).run();
    await a.sync();
    const { count } = await a.client
      .from('workout_sets')
      .select('*', { count: 'exact', head: true });
    expect(count).toBe(1);
    expect(a.workout(w)!.dirty).toBe(false);
  });

  it('a stale push loses and adopts the server version (LWW)', async () => {
    const w = randomUUID();
    a.addWorkout(w, t0);
    await a.sync();
    await b.sync();
    b.renameWorkout(w, 'from B', t0 + 2_000);
    await b.sync();
    a.renameWorkout(w, 'from A', t0 + 1_000); // older than B's edit
    await a.push();
    expect(a.workout(w)).toMatchObject({ routineNameSnapshot: 'from B', dirty: false });
  });

  // The pull rules only matter for dirty rows that weren't pushed (held by a conflict, or edited
  // between push and pull), so they are exercised with pull() alone.
  describe('pull over local changes not pushed yet (07 §4.1)', () => {
    let w: string;
    let s: string;
    beforeEach(async () => {
      w = randomUUID();
      s = randomUUID();
      a.addWorkout(w, t0);
      a.addSet(s, w, t0);
      await a.sync();
      await b.sync();
    });

    it('a newer dirty local row is kept and wins on the next push', async () => {
      a.renameWorkout(w, 'B older', t0 + 1_000);
      await a.sync();
      b.renameWorkout(w, 'B newer', t0 + 3_000);
      await b.pull();
      expect(b.workout(w)).toMatchObject({ routineNameSnapshot: 'B newer', dirty: true });
      await b.sync();
      await a.sync();
      expect(a.workout(w)!.routineNameSnapshot).toBe('B newer');
    });

    it('an older dirty local row is replaced by the remote one', async () => {
      a.renameWorkout(w, 'A newer', t0 + 3_000);
      await a.sync();
      b.renameWorkout(w, 'B older', t0 + 1_000);
      await b.pull();
      expect(b.workout(w)).toMatchObject({ routineNameSnapshot: 'A newer', dirty: false });
    });

    it('a pulled tombstone wins over a newer dirty local row (RN-SYNC-04, 15)', async () => {
      a.deleteSet(s, t0 + 1_000);
      await a.sync();
      b.setReps(s, 20, t0 + 9_000);
      await b.pull();
      expect(b.set(s)).toMatchObject({ deletedAt: expect.any(Number), dirty: false });
    });

    it('a local delete is never revived by a pull', async () => {
      a.setReps(s, 11, t0 + 9_000);
      await a.sync();
      b.deleteSet(s, t0 + 1_000);
      await b.pull();
      expect(b.set(s)).toMatchObject({ deletedAt: expect.any(Number), dirty: true });
      await b.sync();
      await a.sync();
      expect(a.set(s)!.deletedAt).not.toBeNull();
    });

    it('a pulled tombstone for a row that does not exist locally is inserted', async () => {
      const c = device(await signIn(email));
      a.deleteSet(s, t0 + 1_000);
      await a.sync();
      await c.pull();
      expect(c.set(s)).toMatchObject({ deletedAt: expect.any(Number) });
    });
  });

  it('two devices with crossed edits and a delete converge (RNF-05, reduced)', async () => {
    const w = randomUUID();
    const s1 = randomUUID();
    const s2 = randomUUID();
    a.addWorkout(w, t0);
    a.addSet(s1, w, t0);
    a.addSet(s2, w, t0);
    await a.sync();
    await b.sync();

    // Offline on both devices.
    a.renameWorkout(w, 'A', t0 + 1_000);
    b.renameWorkout(w, 'B', t0 + 2_000); // newer: wins
    a.deleteSet(s1, t0 + 1_000);
    b.setReps(s1, 10, t0 + 5_000); // newer edit, but the delete always wins
    a.setReps(s2, 12, t0 + 3_000); // newer than B's: wins
    b.setReps(s2, 6, t0 + 2_500);

    await a.sync();
    await b.sync();
    await a.sync();

    expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.workout(w)!.routineNameSnapshot).toBe('B');
    expect(a.set(s1)!.deletedAt).not.toBeNull();
    expect(a.set(s2)!.reps).toBe(12);
    // Nothing left to push on either side.
    expect(a.db.select().from(workoutSets).where(eq(workoutSets.dirty, true)).all()).toEqual([]);
    expect(b.db.select().from(workoutSets).where(eq(workoutSets.dirty, true)).all()).toEqual([]);
  });

  it('a push over a remote tombstone adopts the tombstone (RN-SYNC-04)', async () => {
    const w = randomUUID();
    const s = randomUUID();
    a.addWorkout(w, t0);
    a.addSet(s, w, t0);
    await a.sync();
    await b.sync();
    a.deleteSet(s, t0 + 1_000);
    await a.sync();
    b.setReps(s, 20, t0 + 9_000);
    await b.push();
    expect(b.set(s)).toMatchObject({ deletedAt: expect.any(Number), dirty: false });
  });
});
