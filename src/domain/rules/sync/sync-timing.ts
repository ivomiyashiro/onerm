/** Waits after each failed sync in a row (07 §4.1): 5 s, 15 s, 60 s, and then 5 min at most. */
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];

/**
 * How long to wait before retrying after `failures` failed syncs in a row (1 = the first). The
 * retries only run in the foreground and with pending changes (RNF-22): the scheduler decides that.
 */
export function retryDelayMs(failures: number): number {
  return RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length) - 1];
}

/**
 * A `timestamptz` as the server returns it, in ms since the epoch. It may carry microseconds: they
 * are cut to ms first, so the parse doesn't depend on how far the JS engine reads the fraction.
 */
export function serverTimeMs(text: string): number {
  return Date.parse(text.replace(/(\.\d{3})\d+/, '$1'));
}

/**
 * Where a table's pull resumes (07 §2.4): the `server_updated_at` and `id` of the last row
 * received. `ts` is the server's string, untouched: a `Date` would cut the microseconds, and a
 * full page of rows of the same millisecond would never move forward (spike #13).
 */
export interface PullCursor {
  ts: string;
  id: string;
}

/** The smallest UUID: with `ts` it starts the keyset before every row of that instant. */
const MIN_ID = '00000000-0000-0000-0000-000000000000';

/** How far back the pull reads, against transactions that commit late (ADR-0002 R2). */
const PULL_OVERLAP_MS = 5_000;

/**
 * The first key of a pull (07 §4.1, RN-SYNC-07): the cursor minus the overlap, and the smallest
 * id. The overlap is applied once, here, at the start of the pull, never between its pages: so a
 * page full of rows inside the same 5 s still moves forward (ADR-0002 R9). Null: from the start.
 */
export function pullStart(cursor: PullCursor | null): PullCursor | null {
  if (cursor === null) return null;
  return {
    ts: new Date(serverTimeMs(cursor.ts) - PULL_OVERLAP_MS).toISOString(),
    id: MIN_ID,
  };
}

/** Whether `version` is older than `minimum` (RN-SYNC-14). Versions are `major.minor.patch`. */
export function isOlderVersion(version: string, minimum: string): boolean {
  const parts = (text: string) => text.split('.').map(Number);
  const [a, b] = [parts(version), parts(minimum)];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const [x, y] = [a[i] ?? 0, b[i] ?? 0];
    if (x !== y) return x < y;
  }
  return false;
}
