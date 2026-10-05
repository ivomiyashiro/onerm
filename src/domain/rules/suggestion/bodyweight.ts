import type { EngineState, SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import { analyseExposure } from '@/domain/rules/suggestion/exposure-analysis';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';

/**
 * RN-SUG-12 (ADR-0005): progression by reps only, with no deload, reentry or e1RM. Without any
 * exposure, calibration. Then: at least N sets all at the cap → «ready for a harder variant»;
 * otherwise máx(floor, mín(cap, fewest + 1)). Floor, cap and N are always the current
 * prescription's, also after a range change. Without ERR, the last EE (a substitute, RN-SUG-15).
 */
export function suggestBodyweight(state: EngineState, context: SuggestionContext): Suggestion {
  const lastExposure = state.records.at(-1)?.analysis;
  const lastExercise = context.exerciseExposures.at(-1);
  const analysis = lastExposure ?? (lastExercise && analyseExposure(lastExercise));
  if (analysis === undefined) {
    return {
      loadKg: null,
      reps: context.prescription.repRange.min,
      reason: { code: 'BODYWEIGHT_CALIBRATION' },
    };
  }

  // Always the current prescription: after a range change the suggestion stays inside it.
  const { sets, repRange } = context.prescription;
  const { min, max } = repRange;
  const { repsWithW: reps, limitingSide } = analysis;
  if (reps.length >= sets && reps.every((value) => value >= max)) {
    return { loadKg: null, reps: max, reason: { code: 'BODYWEIGHT_READY', limitingSide } };
  }
  const previousReps = Math.min(...reps);
  return {
    loadKg: null,
    reps: Math.max(min, Math.min(max, previousReps + 1)),
    reason: { code: 'BODYWEIGHT_ADD_REP', previousReps, limitingSide },
  };
}
