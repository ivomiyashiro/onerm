import type { LocalSyncState } from '@/domain/repositories/sync-state-repository';
import { ObserveBackupNotice, type BackupNotice } from '@/domain/usecases/observe-backup-notice';
import type { SyncActivity } from '@/domain/usecases/sync-scheduler';

function noticeFor(local: LocalSyncState, online: boolean | null = true): BackupNotice | null {
  let seen: BackupNotice | null | undefined;
  const activity: SyncActivity = { running: false, lastResult: null, online };
  new ObserveBackupNotice(
    { observe: (observer) => (observer.next(local), () => {}) },
    { observeActivity: (listener) => (listener(activity), () => {}) },
  ).execute({ next: (notice) => (seen = notice), error: () => {} });
  return seen!;
}

describe('ObserveBackupNotice (RF-SYNC-06.AC2)', () => {
  it('nothing to say when everything is backed up', () => {
    expect(
      noticeFor({ pending: 0, conflicts: 0, lastSyncedAt: null, restoreCompleted: true }),
    ).toBeNull();
  });

  it('the pending changes, with or without connection', () => {
    expect(
      noticeFor({ pending: 2, conflicts: 0, lastSyncedAt: null, restoreCompleted: true }, false),
    ).toEqual({
      kind: 'pending',
      count: 2,
      online: false,
    });
    expect(
      noticeFor({ pending: 2, conflicts: 0, lastSyncedAt: null, restoreCompleted: true }, null),
    ).toEqual({
      kind: 'pending',
      count: 2,
      online: true,
    });
  });

  it('rejected changes come first (RN-SYNC-11)', () => {
    expect(
      noticeFor({ pending: 2, conflicts: 1, lastSyncedAt: null, restoreCompleted: true }),
    ).toEqual({
      kind: 'conflict',
      count: 1,
    });
  });
});
