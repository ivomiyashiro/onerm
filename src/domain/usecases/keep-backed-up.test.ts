import type { SyncEngine } from '@/domain/repositories/sync-engine';
import type { SyncTriggerListener, SyncTriggers } from '@/domain/repositories/sync-triggers';
import { KeepBackedUp } from '@/domain/usecases/keep-backed-up';
import { SyncScheduler } from '@/domain/usecases/sync-scheduler';

function setUp() {
  let runs = 0;
  const engine: SyncEngine = {
    sync: async () => {
      runs++;
      return 'synced';
    },
  };
  let listener: SyncTriggerListener | null = null;
  const triggers: SyncTriggers = {
    subscribe(next) {
      listener = next;
      return () => {
        listener = null;
      };
    },
  };
  const scheduler = new SyncScheduler(engine, async () => 1);
  return {
    keepBackedUp: new KeepBackedUp(scheduler, triggers),
    runs: () => runs,
    trigger: () => listener,
  };
}

describe('KeepBackedUp (RN-SYNC-06)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('RF-SYNC-01.AC4: syncs when the app opens', async () => {
    const t = setUp();

    t.keepBackedUp.execute();
    await jest.advanceTimersByTimeAsync(0);

    expect(t.runs()).toBe(1);
  });

  it('RF-SYNC-01.AC1 and AC3: a local write and getting the connection back sync', async () => {
    const t = setUp();
    t.keepBackedUp.execute();
    await jest.advanceTimersByTimeAsync(0);

    t.trigger()!.reconnected();
    await jest.advanceTimersByTimeAsync(0);
    t.trigger()!.localWrite();
    await jest.advanceTimersByTimeAsync(3_000);

    expect(t.runs()).toBe(3);
  });

  it('stopping unsubscribes and cancels what was waiting', async () => {
    const t = setUp();
    const stop = t.keepBackedUp.execute();
    await jest.advanceTimersByTimeAsync(0);
    t.trigger()!.localWrite();

    stop();
    await jest.advanceTimersByTimeAsync(3_000);

    expect(t.trigger()).toBeNull();
    expect(t.runs()).toBe(1);
  });
});
