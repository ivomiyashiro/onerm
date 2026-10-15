import type { DataOwner } from '@/domain/models/data-owner';

/** Who owns the local data, and the operations that depend on it. Local database only. */
export interface AccountRepository {
  readOwner(): Promise<DataOwner>;
  saveOwner(owner: DataOwner): Promise<void>;
  /** When the invitation to create an account was last answered (RF-AUTH-01.AC5), or null. */
  readLastNudgeAt(): Promise<Date | null>;
  saveLastNudgeAt(at: Date): Promise<void>;
  /** The rows waiting to be backed up (RN-SYNC-08). A workout in progress doesn't count. */
  countPendingChanges(): Promise<number>;
  hasWorkoutInProgress(): Promise<boolean>;
  /**
   * 07 §4.4: empties the user tables and the sync state, keeps the catalog, and leaves the owner
   * as a guest without data.
   */
  clearUserData(): Promise<void>;
}
