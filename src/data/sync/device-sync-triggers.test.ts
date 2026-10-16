import { ManualTableChanges } from '@/data/db/table-changes';
import {
  DeviceSyncTriggers,
  type AppStateSource,
  type NetworkSource,
} from '@/data/sync/device-sync-triggers';
import type { SyncTriggerListener } from '@/domain/repositories/sync-triggers';

function setUp() {
  const changes = new ManualTableChanges();
  let appListener: ((state: string) => void) | null = null;
  const appState: AppStateSource = {
    addEventListener: (_, listener) => {
      appListener = listener;
      return { remove: () => (appListener = null) };
    },
  };
  let networkListener: ((state: { isConnected: boolean | null }) => void) | null = null;
  const network: NetworkSource = {
    addEventListener: (listener) => {
      networkListener = listener;
      return () => (networkListener = null);
    },
  };
  const calls: string[] = [];
  const listener: SyncTriggerListener = {
    localWrite: () => calls.push('localWrite'),
    foreground: () => calls.push('foreground'),
    background: () => calls.push('background'),
    reconnected: () => calls.push('reconnected'),
    disconnected: () => calls.push('disconnected'),
  };
  const unsubscribe = new DeviceSyncTriggers(changes, appState, network).subscribe(listener);
  return {
    calls,
    unsubscribe,
    changes,
    app: (state: string) => appListener?.(state),
    network: (isConnected: boolean | null) => networkListener?.({ isConnected }),
  };
}

describe('DeviceSyncTriggers (RN-SYNC-06)', () => {
  it('(a) a write to a user table is a trigger; the catalog and the local-only tables are not', () => {
    const t = setUp();

    t.changes.emit('workout_sets');
    t.changes.emit('exercises');
    t.changes.emit('app_state');

    expect(t.calls).toEqual(['localWrite']);
  });

  it('(c) the foreground, and the background that stops the waiting (RNF-22)', () => {
    const t = setUp();

    t.app('background');
    t.app('active');

    expect(t.calls).toEqual(['background', 'foreground']);
  });

  it('(b) only going from offline to online, not the first report or staying online', () => {
    const t = setUp();

    t.network(true);
    t.network(true);
    t.network(false);
    t.network(false);
    t.network(true);

    expect(t.calls).toEqual(['disconnected', 'reconnected']);
  });

  it('starting offline is reported (RF-SYNC-06: «sin conexión»)', () => {
    const t = setUp();

    t.network(false);

    expect(t.calls).toEqual(['disconnected']);
  });

  it('unsubscribing stops every source', () => {
    const t = setUp();

    t.unsubscribe();
    t.changes.emit('workout_sets');
    t.app('active');
    t.network(false);
    t.network(true);

    expect(t.calls).toEqual([]);
  });
});
