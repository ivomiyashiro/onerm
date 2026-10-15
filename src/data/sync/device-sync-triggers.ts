import type { TableChanges } from '@/data/db/table-changes';
import type { Unsubscribe } from '@/domain/repositories/observer';
import type { SyncTriggerListener, SyncTriggers } from '@/domain/repositories/sync-triggers';

import { USER_TABLES } from './sync-tables';

/** React Native's `AppState`, as much as the triggers use. */
export interface AppStateSource {
  addEventListener(type: 'change', listener: (state: string) => void): { remove(): void };
}

/** NetInfo, as much as the triggers use: it reports the current state first, then each change. */
export interface NetworkSource {
  addEventListener(listener: (state: { isConnected: boolean | null }) => void): () => void;
}

const USER_TABLE_NAMES = new Set(USER_TABLES.map((sync) => sync.name));

/** The triggers of RN-SYNC-06 on the phone. */
export class DeviceSyncTriggers implements SyncTriggers {
  constructor(
    private readonly changes: TableChanges,
    private readonly appState: AppStateSource,
    private readonly network: NetworkSource,
  ) {}

  subscribe(listener: SyncTriggerListener): Unsubscribe {
    // (a) Only the user's tables: the catalog and the local-only state aren't backed up.
    const stopChanges = this.changes.subscribe((tableName) => {
      if (USER_TABLE_NAMES.has(tableName)) listener.localWrite();
    });
    // (c), and the background, where nothing waits to run (RNF-22).
    const appSubscription = this.appState.addEventListener('change', (state) => {
      if (state === 'active') listener.foreground();
      else if (state === 'background') listener.background();
    });
    // (b) Only a real reconnection: the first report and a repeated "online" are not one.
    let wasConnected: boolean | null = null;
    const stopNetwork = this.network.addEventListener(({ isConnected }) => {
      if (wasConnected === false && isConnected === true) listener.reconnected();
      if (isConnected !== null) wasConnected = isConnected;
    });
    return () => {
      stopChanges();
      appSubscription.remove();
      stopNetwork();
    };
  }
}
