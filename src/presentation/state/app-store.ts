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
  /** Bumped when an account was entered on a guest device: the union has to run (07 §4.3). */
  unionRequests: number;
  setAccount(account: AccountState): void;
  requestUnion(): void;
  /** RF-AUTH-06.AC4: the server ended the session; the data stays. */
  markSessionExpired(): void;
  setSyncStatus(syncStatus: SyncStatus): void;
}

export type AppStore = ReturnType<typeof createAppStore>;

/** A factory instead of a module-level store, so each test and the app get their own one. */
export function createAppStore() {
  return createStore<AppState>()((set) => ({
    account: { kind: 'guest' },
    syncStatus: { kind: 'guest' },
    unionRequests: 0,
    setAccount: (account) => set({ account }),
    requestUnion: () => set(({ unionRequests }) => ({ unionRequests: unionRequests + 1 })),
    markSessionExpired: () =>
      set(({ account }) =>
        account.kind === 'user' ? { account: { ...account, sessionExpired: true } } : {},
      ),
    setSyncStatus: (syncStatus) => set({ syncStatus }),
  }));
}
