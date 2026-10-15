import { eq } from 'drizzle-orm';

import { openTestDatabase } from '@/data/db/open-test-database';
import { routineDays, routineExercises, routines, workouts } from '@/data/db/schema';
import { writeSyncRow } from '@/data/db/sync-writes';
import { countUploadable } from '@/data/sync/push';

const USER = 'u1';

function setUp() {
  const { db } = openTestDatabase();
  let now = 1_760_000_000_000;
  const write = <T extends Parameters<typeof writeSyncRow>[1]>(
    table: T,
    values: Parameters<typeof writeSyncRow<T>>[2],
    userId: string = USER,
  ) => writeSyncRow(db, table, values, { now: ++now, userId });
  return { db, write };
}

const workout = (id: string, status: 'finished' | 'in_progress') => ({
  id,
  routineId: null,
  routineDayId: null,
  routineNameSnapshot: 'Full body',
  dayNameSnapshot: 'Día A',
  status,
  startedAt: 1,
  finishedAt: status === 'finished' ? 2 : null,
  notes: null,
});

describe('countUploadable (RN-SYNC-06 a, RN-SYNC-08)', () => {
  it('counts the pending rows the next push would upload', () => {
    const { db, write } = setUp();
    write(routines, { id: 'r1', name: 'A', sourceTemplateId: null });
    write(workouts, workout('w1', 'finished'));

    expect(countUploadable(db, USER)).toBe(2);
  });

  it('leaves out what the push holds: a conflict and its children, a workout in progress, another owner', () => {
    const { db, write } = setUp();
    write(routines, { id: 'r1', name: 'A', sourceTemplateId: null });
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
    write(workouts, workout('w1', 'in_progress'));
    write(routines, { id: 'r2', name: 'B', sourceTemplateId: null }, 'someone-else');

    expect(countUploadable(db, USER)).toBe(0);
  });
});
