import type { SyncEngine, SyncResult } from '@/domain/repositories/sync-engine';
import { SyncScheduler } from '@/domain/usecases/sync-scheduler';

/** An engine whose runs the test finishes by hand, to see what happens while one is running. */
function manualEngine() {
  const runs: ((result: SyncResult) => void)[] = [];
  const engine: SyncEngine = {
    sync: () => new Promise<SyncResult>((resolve) => runs.push(resolve)),
  };
  return {
    engine,
    runs: () => runs.length,
    finish: async (result: SyncResult = 'synced') => {
      runs[runs.length - 1](result);
      await jest.advanceTimersByTimeAsync(0);
    },
  };
}

/** An engine that answers at once. */
function answeringEngine(result: SyncResult) {
  let runs = 0;
  const engine: SyncEngine = {
    sync: async () => {
      runs++;
      return result;
    },
  };
  return { engine, runs: () => runs };
}

describe('SyncScheduler (RN-SYNC-06)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('RN-SYNC-06 (a): groups the writes of 3 s into one sync', async () => {
    const fake = answeringEngine('synced');
    const scheduler = new SyncScheduler(fake.engine, async () => 1);

    scheduler.afterWrite();
    await jest.advanceTimersByTimeAsync(2_000);
    scheduler.afterWrite();
    await jest.advanceTimersByTimeAsync(2_999);
    expect(fake.runs()).toBe(0);

    await jest.advanceTimersByTimeAsync(1);
    expect(fake.runs()).toBe(1);
  });

  it('RN-SYNC-08: a write with nothing to upload does not sync (the sync’s own writes, a workout in progress)', async () => {
    const fake = answeringEngine('synced');
    const scheduler = new SyncScheduler(fake.engine, async () => 0);

    scheduler.afterWrite();
    await jest.advanceTimersByTimeAsync(3_000);

    expect(fake.runs()).toBe(0);
  });

  it('a trigger during a sync runs it again once at the end, never two at a time', async () => {
    const fake = manualEngine();
    const scheduler = new SyncScheduler(fake.engine, async () => 0);

    void scheduler.syncNow();
    const second = scheduler.syncNow();
    const third = scheduler.syncNow();
    expect(fake.runs()).toBe(1);

    await fake.finish();
    expect(fake.runs()).toBe(2);
    await fake.finish('failed');

    // Whoever asked during the first run gets the result of the run that started after asking.
    await expect(second).resolves.toBe('failed');
    await expect(third).resolves.toBe('failed');
  });

  it('07 §4.1: after a failure with pending changes it retries in 5 s, 15 s, 60 s', async () => {
    const fake = answeringEngine('failed');
    const scheduler = new SyncScheduler(fake.engine, async () => 2);

    await scheduler.syncNow();
    await jest.advanceTimersByTimeAsync(4_999);
    expect(fake.runs()).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(fake.runs()).toBe(2);
    await jest.advanceTimersByTimeAsync(15_000);
    expect(fake.runs()).toBe(3);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(fake.runs()).toBe(4);
  });

  it('RNF-22: without pending changes a failure is not retried; the next trigger syncs', async () => {
    const fake = answeringEngine('failed');
    const scheduler = new SyncScheduler(fake.engine, async () => 0);

    await scheduler.syncNow();
    await jest.advanceTimersByTimeAsync(600_000);

    expect(fake.runs()).toBe(1);
  });

  it('RNF-22: in the background nothing is retried or grouped; back in the foreground it syncs (RN-SYNC-06 c)', async () => {
    const fake = answeringEngine('failed');
    const scheduler = new SyncScheduler(fake.engine, async () => 2);

    await scheduler.syncNow();
    scheduler.afterWrite();
    scheduler.enterBackground();
    await jest.advanceTimersByTimeAsync(600_000);
    expect(fake.runs()).toBe(1);

    scheduler.enterForeground();
    await jest.advanceTimersByTimeAsync(0);
    expect(fake.runs()).toBe(2);
  });

  it('a sync that succeeds resets the backoff', async () => {
    let result: SyncResult = 'failed';
    let runs = 0;
    const engine: SyncEngine = {
      sync: async () => {
        runs++;
        return result;
      },
    };
    const scheduler = new SyncScheduler(engine, async () => 1);

    await scheduler.syncNow();
    await jest.advanceTimersByTimeAsync(5_000);
    result = 'synced';
    await jest.advanceTimersByTimeAsync(15_000);
    expect(runs).toBe(3);

    result = 'failed';
    await scheduler.syncNow();
    await jest.advanceTimersByTimeAsync(5_000);
    expect(runs).toBe(5);
  });

  it('an engine that throws counts as a failed sync, never as an unhandled error', async () => {
    const engine: SyncEngine = { sync: () => Promise.reject(new Error('boom')) };
    const scheduler = new SyncScheduler(engine, async () => 0);

    await expect(scheduler.syncNow()).resolves.toBe('failed');
  });

  it('stop cancels what was waiting', async () => {
    const fake = answeringEngine('failed');
    const scheduler = new SyncScheduler(fake.engine, async () => 1);

    await scheduler.syncNow();
    scheduler.afterWrite();
    scheduler.stop();
    await jest.advanceTimersByTimeAsync(600_000);

    expect(fake.runs()).toBe(1);
  });

  it('stop during a sync leaves no retry behind when that sync fails', async () => {
    const fake = manualEngine();
    const scheduler = new SyncScheduler(fake.engine, async () => 1);

    void scheduler.syncNow();
    scheduler.stop();
    await fake.finish('failed');
    await jest.advanceTimersByTimeAsync(600_000);

    expect(fake.runs()).toBe(1);
  });
});
