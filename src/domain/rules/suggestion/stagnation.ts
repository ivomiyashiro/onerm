import { areLoadsEqual } from '@/domain/rules/load-equality';
import type { PerformanceMark, Priority } from '@/domain/rules/suggestion/engine-types';
import type { ExposureAnalysis } from '@/domain/rules/suggestion/exposure-analysis';
import { decreaseLoad } from '@/domain/rules/suggestion/load-grid';
import { SUGGESTION_PARAMETERS } from '@/domain/rules/suggestion/parameters';
import { lastLoadedRecord } from '@/domain/rules/suggestion/progression';

const { STAGNATION_THRESHOLD, DELOAD } = SUGGESTION_PARAMETERS;

/**
 * RN-SUG-04: the mark of an ERR is W and the mean reps per set with W, so an extra set doesn't
 * inflate it and a missing one doesn't lower it. Null without W.
 */
export function markOf(analysis: ExposureAnalysis): PerformanceMark | null {
  const { workingLoadKg, repsWithW } = analysis;
  if (workingLoadKg === null) return null;
  const meanReps = repsWithW.reduce((sum, reps) => sum + reps, 0) / repsWithW.length;
  return { loadKg: workingLoadKg, meanReps };
}

/** Compared by load first and, with the same load (RN-GEN-02), by mean reps. */
export function isBetterMark(mark: PerformanceMark, than: PerformanceMark): boolean {
  if (!areLoadsEqual(mark.loadKg, than.loadKg)) return mark.loadKg > than.loadKg;
  return mark.meanReps > than.meanReps;
}

/**
 * RN-SUG-04, one ERR: a reset starts the best mark and the count again; a better mark sets the
 * count to 0; an ERR with every set with W at the cap never adds to it, with N sets or fewer
 * (caso Q); otherwise it adds 1.
 */
export function nextStagnation(
  previous: { bestMark: PerformanceMark | null; stagnationCount: number } | undefined,
  analysis: ExposureAnalysis,
  isReset: boolean,
): { bestMark: PerformanceMark | null; stagnationCount: number } {
  const mark = markOf(analysis);
  if (isReset || previous === undefined || previous.bestMark === null || mark === null) {
    return { bestMark: mark, stagnationCount: 0 };
  }
  if (isBetterMark(mark, previous.bestMark)) return { bestMark: mark, stagnationCount: 0 };
  const { bestMark, stagnationCount } = previous;
  // At the cap (or every set with W at the cap but fewer than N: COMPLETE_SETS) it never adds.
  const allWAtCap = analysis.repsWithW.every((reps) => reps >= analysis.repRange.max);
  if (analysis.range === 'capReached' || allWAtCap) return { bestMark, stagnationCount };
  return { bestMark, stagnationCount: stagnationCount + 1 };
}

/** 4. Deload (RN-SUG-04): after 3 ERR in a row without a better mark, bajada(W, 10 %), floor. */
export const deload: Priority = (state, context) => {
  const last = lastLoadedRecord(state);
  if (last === null || last.stagnationCount < STAGNATION_THRESHOLD || last.bestMark === null) {
    return null;
  }
  const { workingLoadKg, analysis } = last;
  return {
    loadKg: decreaseLoad(workingLoadKg, DELOAD, context.grid),
    reps: analysis.repRange.min,
    reason: {
      code: 'DELOAD',
      stagnantExposures: last.stagnationCount,
      bestMark: last.bestMark,
      workingLoadKg,
      limitingSide: analysis.limitingSide,
    },
  };
};
