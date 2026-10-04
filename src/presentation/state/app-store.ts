import { createStore } from 'zustand/vanilla';

import type { DataOwner } from '@/domain/models/data-owner';
import type { SyncStatus } from '@/domain/models/sync-status';

/**
 * Global app state (ADR-0011 §2): only what several screens share. Persistent data is not copied
 * here; it is observed from SQLite.
 */
export interface AppState {
  owner: DataOwner;
  syncStatus: SyncStatus;
  setOwner(owner: DataOwner): void;
  setSyncStatus(syncStatus: SyncStatus): void;
}

export type AppStore = ReturnType<typeof createAppStore>;

/** A factory instead of a module-level store, so each test and the app get their own one. */
export function createAppStore() {
  return createStore<AppState>()((set) => ({
    owner: { kind: 'guest' },
    syncStatus: { kind: 'guest' },
    setOwner: (owner) => set({ owner }),
    setSyncStatus: (syncStatus) => set({ syncStatus }),
  }));
}
