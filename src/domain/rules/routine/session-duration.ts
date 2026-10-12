import type { Prescription } from '@/domain/models/prescription';

/** C-06: the time of one set, without the rest. */
const SECONDS_PER_SET = 40;

/**
 * C-06 (11 §1): the estimated minutes of a session, 40 s per set plus its rest, without the
 * warm-up or the changes between machines. Rounded to the nearest minute.
 */
export function sessionMinutes(prescriptions: readonly Prescription[]): number {
  const seconds = prescriptions.reduce(
    (total, { sets, restSeconds }) => total + sets * (SECONDS_PER_SET + restSeconds),
    0,
  );
  return Math.round(seconds / 60);
}
