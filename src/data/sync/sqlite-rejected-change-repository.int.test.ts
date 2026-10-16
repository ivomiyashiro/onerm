import type { SupabaseClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

import { openTestDatabase } from '@/data/db/open-test-database';
import { appState, routineDays, routineExercises, routines } from '@/data/db/schema';
import { writeSyncRow } from '@/data/db/sync-writes';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SqliteRejectedChangeRepository } from '@/data/sync/sqlite-rejected-change-repository';
import type { RejectedChange } from '@/domain/models/rejected-change';

const USER = 'u1';

function setUp() {
  const { db } = openTestDatabase();
  db.insert(appState).values({ owner: USER }).run();
  let now = 1_760_000_000_000;
  const write = <T extends Parameters<typeof writeSyncRow>[1]>(
    table: T,
    values: Parameters<typeof writeSyncRow<T>>[2],
  ) => writeSyncRow(db, table, values, { now: ++now, userId: USER });
  // A routine with a day and an exercise, none uploaded; the server rejected the routine.
  write(routines, { id: 'r1', name: 'Fuerza', sourceTemplateId: null });
  write(routineDays, { id: 'd1', routineId: 'r1', name: 'Día A', position: 1 });
  write(routineExercises, {
    id: 'e1',
    routineDayId: 'd1',
    exerciseId: 'x',
    position: 1,
    role: 'main',
    sets: 3,
    repMin: 6,
    repMax: 8,
    restSeconds: 120,
    targetRir: 2,
    notes: null,
  });
  db.update(routines).set({ conflict: '23514' }).where(eq(routines.id, 'r1')).run();
  const repository = new SqliteRejectedChangeRepository(() => db, new ManualTableChanges(), null);
  const list = () => {
    let seen: RejectedChange[] = [];
    repository.observe({ next: (changes) => (seen = changes), error: () => {} })();
    return seen;
  };
  return { db, repository, list };
}

describe('SqliteRejectedChangeRepository (RN-SYNC-11)', () => {
  it('RF-SYNC-06.AC4: lists the rejected record, its reason and what depends on it', () => {
    const { list } = setUp();

    expect(list()).toEqual([
      {
        kind: 'routine',
        id: 'r1',
        reason: '23514',
        name: 'Fuerza',
        uploadedBefore: false,
        dependents: 2,
      },
    ]);
  });

  it('discarding a change that never reached the server deletes it with its children (RN-SYNC-15)', async () => {
    const { db, repository, list } = setUp();

    await expect(repository.discard(list()[0])).resolves.toBe('done');

    expect(db.select().from(routines).all()).toEqual([]);
    expect(db.select().from(routineDays).all()).toEqual([]);
    expect(db.select().from(routineExercises).all()).toEqual([]);
  });

  it('discarding needs the server to say whether it has a copy: without connection nothing changes', async () => {
    const { db, list } = setUp();
    // A server that can't be reached: every read fails.
    const unreachable = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'offline' } }) }),
        }),
      }),
    } as unknown as SupabaseClient;
    const repository = new SqliteRejectedChangeRepository(
      () => db,
      new ManualTableChanges(),
      unreachable,
    );

    await expect(repository.discard(list()[0])).resolves.toBe('offline');
    expect(db.select().from(routines).all()).toHaveLength(1);
  });

  it('«Reintentar»: the change is pending again, without its conflict', async () => {
    const { db, repository, list } = setUp();

    await repository.retry(list()[0]);

    expect(db.select().from(routines).where(eq(routines.id, 'r1')).get()).toMatchObject({
      dirty: true,
      conflict: null,
    });
    expect(list()).toEqual([]);
  });
});
