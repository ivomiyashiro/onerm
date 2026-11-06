/** How a sync ended (07 §4.1). */
export type SyncResult =
  /** Catalog, push and pull done. Rejected rows stay in conflict: they don't fail the sync. */
  | 'synced'
  /** A guest only downloads the catalog (RN-SYNC-09). */
  | 'guest'
  /** The network or the server failed; what was done is kept, the rest waits for a retry. */
  | 'failed'
  /** No valid session for the device's owner: nothing of the user goes up or down (RN-AUTH-07). */
  | 'sessionExpired'
  /** The server asks for a newer app: the sync pauses (RN-SYNC-14). */
  | 'appOutdated';

/** How far the restoration of the account went (RF-SYNC-03, S23): records downloaded of the total. */
export interface RestoreProgress {
  done: number;
  total: number;
}

/** One run of the sync of 07 §4.1: catalog, then push, then pull. */
export interface SyncEngine {
  /** `onRestore` hears the progress while the account is not restored yet (07 §4.2). */
  sync(onRestore?: (progress: RestoreProgress) => void): Promise<SyncResult>;
}
