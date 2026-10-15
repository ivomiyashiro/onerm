import type { SyncStatus } from '@/domain/models/sync-status';
import { profile } from '@/presentation/strings/profile';

const { sync } = profile;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** {tiempo} of «Respaldado · hace {tiempo}»: the largest whole unit since the last backup. */
function timeSince(at: Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - at.getTime());
  if (elapsed < MINUTE) return sync.lessThanAMinute;
  if (elapsed < HOUR) return sync.minutes(Math.floor(elapsed / MINUTE));
  if (elapsed < DAY) return sync.hours(Math.floor(elapsed / HOUR));
  return sync.days(Math.floor(elapsed / DAY));
}

/** The 13-textos §9 sentence of each backup status (RF-SYNC-06). */
export function syncStatusText(status: SyncStatus, now: Date): string {
  switch (status.kind) {
    case 'synced':
      return sync.synced(timeSince(status.lastSyncedAt, now));
    case 'syncing':
      return sync.syncing;
    case 'pending':
      return status.online ? sync.pendingOnline(status.count) : sync.pendingOffline(status.count);
    case 'workoutInProgress':
      return sync.workoutInProgress;
    case 'sessionExpired':
      return sync.sessionExpired;
    case 'networkError':
      return sync.networkError;
    case 'conflict':
      return sync.conflict(status.count);
    case 'guest':
      return sync.guest;
    case 'appOutdated':
      return sync.appOutdated;
  }
}
