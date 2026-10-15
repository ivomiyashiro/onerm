/** The sync columns the conflict rules look at (07 §2.1). Times are ms since the epoch. */
export interface SyncMeta {
  updatedAt: number;
  deletedAt: number | null;
  /** Pending push (`_dirty`). */
  dirty: boolean;
}

/** What the pull does with one remote row: write it over the local one, or keep the local one. */
export type PullAction = 'write' | 'keep';

/**
 * The client side of LWW and deletes, for each row the pull receives (07 §4.1). The order matters:
 * - a remote tombstone is always written, even over a pending edit or a row that doesn't exist
 *   locally (RN-SYNC-04, RN-SYNC-15);
 * - a local delete is kept: it never comes back to life;
 * - a pending local edit newer than the remote one is kept, and wins in the next push;
 * - anything else takes the remote version (on a tie the server wins, RN-SYNC-03).
 */
export function pullAction(
  local: SyncMeta | null,
  remote: Pick<SyncMeta, 'updatedAt' | 'deletedAt'>,
): PullAction {
  if (remote.deletedAt !== null) return 'write';
  if (local === null) return 'write';
  if (local.deletedAt !== null) return 'keep';
  if (local.dirty && local.updatedAt > remote.updatedAt) return 'keep';
  return 'write';
}

/**
 * Whether the client takes the row the push upsert returned (07 §3, ADR-0002 6b). The server
 * returns the row as it ended up, also when the change lost by LWW, so adopting it converges. A
 * row edited while the request was in flight keeps its edit, still pending for the next push.
 */
export function adoptsServerRow(
  sentUpdatedAt: number,
  current: Pick<SyncMeta, 'updatedAt'> | null,
): boolean {
  return current !== null && current.updatedAt === sentUpdatedAt;
}
