import { eq } from 'drizzle-orm';

import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import { appState, routineDays, routines } from '@/data/db/schema';
import { currentUserId, softDelete, writeSyncRow } from '@/data/db/sync-writes';

const T0 = 1_780_000_000_000;

let t: TestDatabase;

beforeEach(() => {
  t = openTestDatabase();
});

afterEach(() => {
  t.sqlite.close();
});

const routine = () => t.db.select().from(routines).where(eq(routines.id, 'r1')).get();

/** Marks the row as pushed, as the sync will (F6). */
const markPushed = () => t.db.update(routines).set({ dirty: false }).run();

describe('currentUserId (07 §2.1)', () => {
  it('is null for a guest, also before app_state exists', () => {
    expect(currentUserId(t.db)).toBeNull();
    t.db.insert(appState).values({}).run();
    expect(currentUserId(t.db)).toBeNull();
  });

  it('is the owner id once signed in', () => {
    t.db.insert(appState).values({ owner: 'u1' }).run();
    expect(currentUserId(t.db)).toBe('u1');
  });
});

describe('writeSyncRow (RN-GEN-03, RN-SYNC-15)', () => {
  it('inserts a new row pending push, with the owner and both times', () => {
    expect(
      writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: 'u1' }),
    ).toBe('inserted');

    expect(routine()).toMatchObject({
      name: 'Full body',
      userId: 'u1',
      createdAt: T0,
      updatedAt: T0,
      dirty: true,
      deletedAt: null,
    });
  });

  it('a guest writes with user_id null', () => {
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: null });
    expect(routine()?.userId).toBeNull();
  });

  it('updates a changed row: pending push again, with a later updated_at', () => {
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: null });
    markPushed();

    expect(
      writeSyncRow(t.db, routines, { id: 'r1', name: 'Torso' }, { now: T0 + 50, userId: null }),
    ).toBe('updated');
    expect(routine()).toMatchObject({
      name: 'Torso',
      updatedAt: T0 + 50,
      createdAt: T0,
      dirty: true,
    });
  });

  it('RN-GEN-03 · keeps updated_at monotonic when the clock went back', () => {
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: null });

    writeSyncRow(t.db, routines, { id: 'r1', name: 'Torso' }, { now: T0 - 60_000, userId: null });

    expect(routine()?.updatedAt).toBe(T0 + 1);
  });

  it('leaves an unchanged row as it is, so the sync does not push it again', () => {
    writeSyncRow(
      t.db,
      routines,
      { id: 'r1', name: 'Full body', sourceTemplateId: null },
      { now: T0, userId: null },
    );
    markPushed();

    expect(
      writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0 + 50, userId: null }),
    ).toBe('unchanged');
    expect(routine()).toMatchObject({ updatedAt: T0, dirty: false });
  });

  it('keeps the owner of an existing row', () => {
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: 'u1' });
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Torso' }, { now: T0 + 1, userId: 'u2' });
    expect(routine()?.userId).toBe('u1');
  });

  it('RN-SYNC-15 · never revives a deleted row', () => {
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: null });
    softDelete(t.db, routines, eq(routines.id, 'r1'), T0 + 1);

    expect(
      writeSyncRow(t.db, routines, { id: 'r1', name: 'Torso' }, { now: T0 + 2, userId: null }),
    ).toBe('deleted');
    expect(routine()).toMatchObject({ name: 'Full body', deletedAt: T0 + 1 });
  });
});

describe('softDelete (RN-SYNC-15, RN-SYNC-04)', () => {
  it('marks deleted_at, bumps updated_at and leaves the row pending push', () => {
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: null });
    markPushed();

    softDelete(t.db, routines, eq(routines.id, 'r1'), T0 + 10);

    expect(routine()).toMatchObject({ deletedAt: T0 + 10, updatedAt: T0 + 10, dirty: true });
  });

  it('bumps updated_at past the previous value when the clock went back', () => {
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: null });

    softDelete(t.db, routines, eq(routines.id, 'r1'), T0 - 5_000);

    expect(routine()?.updatedAt).toBe(T0 + 1);
  });

  it('does not touch rows already deleted', () => {
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: null });
    softDelete(t.db, routines, eq(routines.id, 'r1'), T0 + 10);
    markPushed();

    softDelete(t.db, routines, eq(routines.id, 'r1'), T0 + 20);

    expect(routine()).toMatchObject({ deletedAt: T0 + 10, dirty: false });
  });

  it('works on any sync table, with any condition', () => {
    writeSyncRow(t.db, routines, { id: 'r1', name: 'Full body' }, { now: T0, userId: null });
    writeSyncRow(
      t.db,
      routineDays,
      { id: 'd1', routineId: 'r1', name: 'A', position: 1 },
      { now: T0, userId: null },
    );

    softDelete(t.db, routineDays, eq(routineDays.routineId, 'r1'), T0 + 1);

    expect(t.db.select().from(routineDays).get()?.deletedAt).toBe(T0 + 1);
    expect(routine()?.deletedAt).toBeNull();
  });
});
