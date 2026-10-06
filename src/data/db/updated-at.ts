/**
 * The `updated_at` of a local write (RN-GEN-03): `max(now, previous + 1 ms)`. It never goes back,
 * so if the device clock is corrected backwards the user's later edits still win LWW
 * (RN-SYNC-03). `previous` is null on the first write of the row. Times are ms since the epoch.
 */
export function nextUpdatedAt(now: number, previous: number | null): number {
  return previous === null ? now : Math.max(now, previous + 1);
}
