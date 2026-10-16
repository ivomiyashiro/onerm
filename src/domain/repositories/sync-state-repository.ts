import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** What the device knows about its backup (07 §2.4). Local database only. */
export interface LocalSyncState {
  /** Whose the device is: a guest's or an account's (07 §2.4 `owner`). */
  owner: 'guest' | 'user';
  /** Changes the next push would upload (RN-SYNC-08). */
  pending: number;
  /** Changes the server rejected (RN-SYNC-11). */
  conflicts: number;
  /** When a sync last ended well; null if never. */
  lastSyncedAt: Date | null;
  /**
   * Every table of the account was downloaded to the end at least once (RF-SYNC-03). Always true
   * for a guest: there is nothing to restore.
   */
  restoreCompleted: boolean;
}

export interface SyncStateRepository {
  observe(observer: Observer<LocalSyncState>): Unsubscribe;
}
