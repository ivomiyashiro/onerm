import type { UnilateralSet } from '@/domain/models/workout';

export interface SideResult {
  readonly side: 'left' | 'right';
  readonly reps: number;
  readonly rir: number | null;
}

/**
 * RN-ENT-06: the side the engine uses in a unilateral set (ADR-0008). Fewer reps; on a tie, the
 * lower of the reported RIRs; if only one side has RIR, that side; otherwise the left one, so the
 * result is deterministic.
 */
export function limitingSide(set: UnilateralSet): SideResult {
  const left: SideResult = { side: 'left', reps: set.repsLeft, rir: set.rirLeft };
  const right: SideResult = { side: 'right', reps: set.repsRight, rir: set.rirRight };

  if (left.reps !== right.reps) return left.reps < right.reps ? left : right;
  if (right.rir === null) return left;
  if (left.rir === null) return right;
  return right.rir < left.rir ? right : left;
}
