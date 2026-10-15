/** RF-AUTH-01.AC5: the invitation to create an account comes back after at least 7 days. */
export const NUDGE_INTERVAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `now` is passed in, never read (ADR-0009). */
export function isNudgeDue(lastAnsweredAt: Date | null, now: Date): boolean {
  if (lastAnsweredAt === null) return true;
  return now.getTime() - lastAnsweredAt.getTime() >= NUDGE_INTERVAL_DAYS * DAY_MS;
}
