import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** What the device knows about its backup (07 §2.4). Local database only. */
export interface LocalSyncState {
  /** Changes the next push would upload (RN-SYNC-08). */
  pending: number;
  /** Changes the server rejected (RN-SYNC-11). */
  conflicts: number;
  /** When a sync last ended well; null if never. */
  lastSyncedAt: Date | null;
}

export interface SyncStateRepository {
  observe(observer: Observer<LocalSyncState>): Unsubscribe;
}
