import { syncStatusOf, type SyncStatusInput } from '@/domain/rules/sync/sync-status';

const LAST = new Date('2026-10-15T12:00:00Z');

/** A signed-in device, online, with everything backed up. */
function input(overrides: Partial<SyncStatusInput> = {}): SyncStatusInput {
  return {
    owner: 'user',
    sessionExpired: false,
    running: false,
    lastResult: 'synced',
    online: true,
    pending: 0,
    conflicts: 0,
    workoutInProgress: false,
    lastSyncedAt: LAST,
    ...overrides,
  };
}

describe('syncStatusOf (RF-SYNC-06)', () => {
  it('synced: everything up, with the time of the last backup', () => {
    expect(syncStatusOf(input())).toEqual({ kind: 'synced', lastSyncedAt: LAST });
  });

  it('syncing while a sync runs, and before the first one ends', () => {
    expect(syncStatusOf(input({ running: true, pending: 2 }))).toEqual({ kind: 'syncing' });
    expect(syncStatusOf(input({ lastSyncedAt: null, lastResult: null }))).toEqual({
      kind: 'syncing',
    });
  });

  it('pending, with or without connection (RN-SYNC-08)', () => {
    expect(syncStatusOf(input({ pending: 3, online: false }))).toEqual({
      kind: 'pending',
      count: 3,
      online: false,
    });
    expect(syncStatusOf(input({ pending: 3 }))).toEqual({
      kind: 'pending',
      count: 3,
      online: true,
    });
  });

  it('network error: the last sync failed while online', () => {
    expect(syncStatusOf(input({ lastResult: 'failed', pending: 1 }))).toEqual({
      kind: 'networkError',
    });
  });

  it('network error also when only the pull failed, with nothing to upload (AC5: «Reintentar»)', () => {
    expect(syncStatusOf(input({ lastResult: 'failed', pending: 0 }))).toEqual({
      kind: 'networkError',
    });
  });

  it('without connection, pending changes say so rather than an error', () => {
    expect(syncStatusOf(input({ lastResult: 'failed', pending: 1, online: false }))).toEqual({
      kind: 'pending',
      count: 1,
      online: false,
    });
  });

  it('RN-SYNC-11: rejected changes count apart and come before the pending ones', () => {
    expect(syncStatusOf(input({ conflicts: 2, pending: 5, online: false }))).toEqual({
      kind: 'conflict',
      count: 2,
    });
  });

  it('RN-SYNC-13: a workout in progress, with nothing else to say', () => {
    expect(syncStatusOf(input({ workoutInProgress: true }))).toEqual({
      kind: 'workoutInProgress',
    });
    expect(syncStatusOf(input({ workoutInProgress: true, pending: 1 }))).toEqual({
      kind: 'pending',
      count: 1,
      online: true,
    });
  });

  it('the account states go first: guest, session expired, app outdated (RN-SYNC-09, RN-SYNC-14)', () => {
    expect(syncStatusOf(input({ owner: 'guest', conflicts: 1 }))).toEqual({ kind: 'guest' });
    expect(syncStatusOf(input({ sessionExpired: true, running: true }))).toEqual({
      kind: 'sessionExpired',
    });
    expect(syncStatusOf(input({ lastResult: 'sessionExpired' }))).toEqual({
      kind: 'sessionExpired',
    });
    expect(syncStatusOf(input({ lastResult: 'appOutdated', conflicts: 1 }))).toEqual({
      kind: 'appOutdated',
    });
  });
});
