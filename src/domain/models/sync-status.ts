/** The backup states the user can see (RF-SYNC-06 table, 13-textos §9). */
export type SyncStatus =
  | { kind: 'guest' }
  | { kind: 'synced'; lastSyncedAt: Date }
  | { kind: 'syncing' }
  | { kind: 'pending'; count: number; online: boolean }
  | { kind: 'workoutInProgress' }
  | { kind: 'sessionExpired' }
  | { kind: 'networkError' }
  | { kind: 'conflict'; count: number }
  | { kind: 'appOutdated' };
