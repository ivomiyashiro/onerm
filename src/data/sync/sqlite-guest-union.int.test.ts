import { openTestDatabase } from '@/data/db/open-test-database';
import { routines, workouts } from '@/data/db/schema';
import { softDelete, writeSyncRow } from '@/data/db/sync-writes';
import { SqliteGuestUnion } from '@/data/sync/sqlite-guest-union';
import { eq } from 'drizzle-orm';

const workout = (id: string, status: 'finished' | 'in_progress') => ({
  id,
  routineId: null,
  routineDayId: null,
  routineNameSnapshot: 'A',
  dayNameSnapshot: 'Día A',
  status,
  startedAt: 1,
  finishedAt: status === 'finished' ? 2 : null,
  notes: null,
});

describe('SqliteGuestUnion: the guest summary (RN-AUTH-05, D01)', () => {
  it('counts finished workouts and routines, not deleted ones, and the workout in progress', async () => {
    const { db } = openTestDatabase();
    const guest = { now: 1, userId: null };
    writeSyncRow(db, routines, { id: 'r1', name: 'A', sourceTemplateId: null }, guest);
    writeSyncRow(db, routines, { id: 'r2', name: 'B', sourceTemplateId: null }, guest);
    softDelete(db, routines, eq(routines.id, 'r2'), 2);
    writeSyncRow(db, workouts, workout('w1', 'finished'), guest);
    writeSyncRow(db, workouts, workout('w2', 'finished'), guest);
    writeSyncRow(db, workouts, workout('w3', 'in_progress'), guest);

    const summary = await new SqliteGuestUnion(() => db, null).guestSummary();

    expect(summary).toEqual({ workouts: 2, routines: 1, workoutInProgress: true });
  });
});
