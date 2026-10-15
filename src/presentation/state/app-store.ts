import { createStore } from 'zustand/vanilla';

import type { AccountState } from '@/domain/models/account';
import type { SyncStatus } from '@/domain/models/sync-status';

/**
 * Global app state (ADR-0011 §2): only what several screens share. Persistent data is not copied
 * here; it is observed from SQLite.
 */
export interface AppState {
  /** Whose data this is and whether the session is alive (RF-AUTH-06). */
  account: AccountState;
  syncStatus: SyncStatus;
  setAccount(account: AccountState): void;
  setSyncStatus(syncStatus: SyncStatus): void;
}

export type AppStore = ReturnType<typeof createAppStore>;

/** A factory instead of a module-level store, so each test and the app get their own one. */
export function createAppStore() {
  return createStore<AppState>()((set) => ({
    account: { kind: 'guest' },
    syncStatus: { kind: 'guest' },
    setAccount: (account) => set({ account }),
    setSyncStatus: (syncStatus) => set({ syncStatus }),
  }));
}
