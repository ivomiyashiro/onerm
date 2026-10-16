import type { Restoration } from '@/domain/usecases/observe-restoration';
import { ObserveRestoration } from '@/domain/usecases/observe-restoration';
import type { SyncActivity } from '@/domain/usecases/sync-scheduler';

function restorationFor(activity: Partial<SyncActivity>): Restoration {
  let seen: Restoration | undefined;
  const full: SyncActivity = {
    running: false,
    lastResult: null,
    online: null,
    restoring: null,
    ...activity,
  };
  new ObserveRestoration({ observeActivity: (listener) => (listener(full), () => {}) }).execute(
    (restoration) => (seen = restoration),
  );
  return seen!;
}

describe('ObserveRestoration (RF-SYNC-03, S23)', () => {
  it('AC1: the records downloaded of the total, and the percentage', () => {
    expect(restorationFor({ running: true, restoring: { done: 30, total: 120 } })).toEqual({
      status: 'restoring',
      done: 30,
      total: 120,
      percent: 25,
    });
  });

  it('nothing to download is 100 %', () => {
    expect(restorationFor({ running: true, restoring: { done: 0, total: 0 } })).toMatchObject({
      percent: 100,
    });
  });

  it('before the counts arrive it is starting', () => {
    expect(restorationFor({ running: true })).toEqual({ status: 'starting' });
    expect(restorationFor({})).toEqual({ status: 'starting' });
  });

  it('AC2: a sync that failed cut the restoration short', () => {
    expect(restorationFor({ lastResult: 'failed' })).toEqual({ status: 'interrupted' });
    expect(restorationFor({ lastResult: 'sessionExpired' })).toEqual({ status: 'interrupted' });
    // RN-SYNC-14: an outdated app can't sync, so it can't wait for the restoration either.
    expect(restorationFor({ lastResult: 'appOutdated' })).toEqual({ status: 'interrupted' });
  });

  it('a sync that ended well finished it: S23 goes on', () => {
    expect(restorationFor({ lastResult: 'synced' })).toEqual({ status: 'finished' });
    expect(restorationFor({ running: true, lastResult: 'synced' })).toEqual({ status: 'starting' });
  });
});
