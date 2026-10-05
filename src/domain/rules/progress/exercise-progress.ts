import { areLoadsEqual } from '@/domain/rules/load-equality';
import type { Id } from '@/domain/models/vocabulary';
import type { E1rm } from '@/domain/rules/suggestion/e1rm';
import type { Exposure, ExposureSet } from '@/domain/rules/suggestion/exposures';
import { exposureE1rm } from '@/domain/rules/suggestion/without-routine-history';

export interface LoggedPerformance {
  readonly loadKg: number;
  readonly reps: number;
}

/** One exposure of the exercise, as the progress shows it (RF-PROG-04). */
export interface ExposureProgress {
  readonly workoutId: Id;
  readonly at: Date;
  /** Null with RTF over 15 or without load (RN-SUG-07). */
  readonly e1rm: E1rm | null;
  /** The heaviest set, then the one with most reps; null for bodyweight. */
  readonly bestSet: LoggedPerformance | null;
  /** For bodyweight (ADR-0005), and useful for any exercise. */
  readonly maxReps: number;
  readonly totalReps: number;
}

/** The heaviest set and, with the same load (RN-GEN-02), the one with most reps. */
export function bestSetOf(sets: readonly ExposureSet[]): LoggedPerformance | null {
  let best: LoggedPerformance | null = null;
  for (const { loadKg, reps } of sets) {
    if (loadKg === null) continue;
    const sameLoad = best !== null && areLoadsEqual(loadKg, best.loadKg);
    if (best === null || (sameLoad ? reps > best.reps : loadKg > best.loadKg)) {
      best = { loadKg, reps };
    }
  }
  return best;
}

/**
 * RN-PROG-01, RN-PROG-02: the progress is per exercise, over all its EE (any routine or day),
 * in order. One entry per exposure; the e1RM chart takes the ones with an e1RM.
 */
export function exerciseProgress(exposures: readonly Exposure[]): ExposureProgress[] {
  return exposures.map((exposure) => {
    const reps = exposure.sets.map((set) => set.reps);
    return {
      workoutId: exposure.workoutId,
      at: exposure.finishedAt,
      e1rm: exposureE1rm(exposure)?.e1rm ?? null,
      bestSet: bestSetOf(exposure.sets),
      maxReps: Math.max(...reps),
      totalReps: reps.reduce((sum, value) => sum + value, 0),
    };
  });
}
