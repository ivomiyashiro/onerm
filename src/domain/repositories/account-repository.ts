import type { DataOwner } from '@/domain/models/data-owner';

/** Who owns the local data, and the operations that depend on it. Local database only. */
export interface AccountRepository {
  readOwner(): Promise<DataOwner>;
  saveOwner(owner: DataOwner): Promise<void>;
  /** The account a guest's data waits to be united with (07 §4.3 step 0), or null. */
  readPendingMigration(): Promise<string | null>;
  savePendingMigration(userId: string | null): Promise<void>;
  /** The email of the owner's account, kept for when its session is gone (RN-AUTH-07). */
  readOwnerEmail(): Promise<string | null>;
  saveOwnerEmail(email: string | null): Promise<void>;
  /** When the invitation to create an account was last answered (RF-AUTH-01.AC5), or null. */
  readLastNudgeAt(): Promise<Date | null>;
  saveLastNudgeAt(at: Date): Promise<void>;
  /** The rows waiting to be backed up (RN-SYNC-08). A workout in progress doesn't count. */
  countPendingChanges(): Promise<number>;
  hasWorkoutInProgress(): Promise<boolean>;
  /**
   * Nothing of a guest on the device: no profile and no data (RN-AUTH-05). Entering an account
   * then skips the union and restores the account (07 §4.3 steps 3 → 6).
   */
  isEmptyDevice(): Promise<boolean>;
  /**
   * 07 §4.4: empties the user tables and the sync state, keeps the catalog, and leaves the owner
   * as a guest without data.
   */
  clearUserData(): Promise<void>;
}
