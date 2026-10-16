import type { SyncStatus } from '@/domain/models/sync-status';
import type { LocalSyncState } from '@/domain/repositories/sync-state-repository';
import { InMemoryWorkoutRepository } from '@/domain/testing/in-memory-repositories';
import { aWorkout } from '@/domain/testing/builders';
import { ObserveSyncStatus } from '@/domain/usecases/observe-sync-status';
import { SyncScheduler } from '@/domain/usecases/sync-scheduler';

function setUp() {
  let emit: (state: LocalSyncState) => void = () => {};
  const local = {
    observe: (observer: { next(state: LocalSyncState): void }) => {
      emit = (state) => observer.next(state);
      emit({
        owner: 'guest',
        pending: 0,
        conflicts: 0,
        lastSyncedAt: new Date('2026-10-15T12:00:00Z'),
        restoreCompleted: true,
      });
      return () => {};
    },
  };
  const workouts = new InMemoryWorkoutRepository();
  const scheduler = new SyncScheduler({ sync: async () => 'failed' }, async () => 0);
  const seen: SyncStatus[] = [];
  const stop = new ObserveSyncStatus(local, workouts, scheduler).execute(
    { owner: 'user', sessionExpired: false },
    { next: (status) => seen.push(status), error: () => {} },
  );
  return { seen, stop, emit: (state: LocalSyncState) => emit(state), workouts, scheduler };
}

describe('ObserveSyncStatus (RF-SYNC-06.AC1)', () => {
  it('starts from what the device knows, before any sync', () => {
    const { seen } = setUp();

    expect(seen.at(-1)).toEqual({
      kind: 'synced',
      lastSyncedAt: new Date('2026-10-15T12:00:00Z'),
    });
  });

  it('follows the local changes, the workout in progress and the scheduler', async () => {
    const { seen, emit, workouts, scheduler } = setUp();

    emit({ owner: 'guest', pending: 2, conflicts: 0, lastSyncedAt: null, restoreCompleted: true });
    expect(seen.at(-1)).toEqual({ kind: 'pending', count: 2, online: true });

    scheduler.disconnected();
    expect(seen.at(-1)).toEqual({ kind: 'pending', count: 2, online: false });

    emit({
      owner: 'guest',
      pending: 0,
      conflicts: 0,
      lastSyncedAt: new Date('2026-10-15T12:00:00Z'),
      restoreCompleted: true,
    });
    await workouts.save(aWorkout({ status: 'in_progress', finishedAt: null }));
    expect(seen.at(-1)).toEqual({ kind: 'workoutInProgress' });
  });

  it('stops following everything when unsubscribed', () => {
    const { seen, stop, scheduler } = setUp();
    const before = seen.length;

    stop();
    scheduler.disconnected();

    expect(seen).toHaveLength(before);
  });
});
