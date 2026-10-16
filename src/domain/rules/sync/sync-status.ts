import type { SyncStatus } from '@/domain/models/sync-status';
import type { SyncResult } from '@/domain/repositories/sync-engine';

/** Everything the backup status depends on (RF-SYNC-06). */
export interface SyncStatusInput {
  owner: 'guest' | 'user';
  /** The server ended the session (RF-AUTH-06.AC4). */
  sessionExpired: boolean;
  /** A sync is running now. */
  running: boolean;
  /** How the last sync ended; null before the first one. */
  lastResult: SyncResult | null;
  /** Null until the device reports it. */
  online: boolean | null;
  /** Changes the next push would upload (RN-SYNC-08). */
  pending: number;
  /** Rejected changes (RN-SYNC-11). */
  conflicts: number;
  workoutInProgress: boolean;
  lastSyncedAt: Date | null;
}

/**
 * The backup status S21 shows (RF-SYNC-06). When several hold at once the first one wins: the
 * account states (nothing else can happen until they are solved), then what is happening now,
 * then what needs the person (a rejected change), then what is waiting, and last the calm states.
 */
export function syncStatusOf(input: SyncStatusInput): SyncStatus {
  const { pending, online, lastResult } = input;
  if (input.owner === 'guest') return { kind: 'guest' };
  if (input.sessionExpired || lastResult === 'sessionExpired') return { kind: 'sessionExpired' };
  if (lastResult === 'appOutdated') return { kind: 'appOutdated' };
  if (input.running) return { kind: 'syncing' };
  if (input.conflicts > 0) return { kind: 'conflict', count: input.conflicts };
  if (pending > 0 && online === false) return { kind: 'pending', count: pending, online: false };
  if (lastResult === 'failed') return { kind: 'networkError' };
  if (pending > 0) return { kind: 'pending', count: pending, online: true };
  if (input.workoutInProgress) return { kind: 'workoutInProgress' };
  if (input.lastSyncedAt === null) return { kind: 'syncing' };
  return { kind: 'synced', lastSyncedAt: input.lastSyncedAt };
}
