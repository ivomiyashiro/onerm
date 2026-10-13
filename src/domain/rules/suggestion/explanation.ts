import type { Prescription } from '@/domain/models/prescription';
import { estimatedOneRepMax, type E1rm } from '@/domain/rules/suggestion/e1rm';
import { fold, orderedContext, suggest } from '@/domain/rules/suggestion/engine';
import type { SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import type { Exposure, ExposureSet } from '@/domain/rules/suggestion/exposures';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';

/**
 * What S10 «¿Por qué?» shows (RF-SUG-07 AC2): the suggestion with its reason (code and
 * parameters, RN-SUG-11) and the data it used. Presentation turns it into the texts of 13 §4.
 */
export interface SuggestionExplanation {
  readonly suggestion: Suggestion;
  /** «La última vez»: the exposure the suggestion builds on; null in calibration. */
  readonly lastTime: { readonly at: Date; readonly sets: readonly ExposureSet[] } | null;
  /** The current prescription: floor, cap and target RIR of the texts. */
  readonly prescription: Prescription;
  /** «Esfuerzo medio»: the mean reported RIR of the sets with W of the last ERR. */
  readonly meanRir: number | null;
  /** «Máximo estimado»: the best e1RM of «La última vez», for intermediate and advanced (P-10). */
  readonly estimatedMax: E1rm | null;
}

/** The highest e1RM of the sets with a load (RN-SUG-07); null when none has one. */
function bestE1rm(sets: readonly ExposureSet[]): E1rm | null {
  let best: E1rm | null = null;
  for (const { loadKg, reps, rir } of sets) {
    const e1rm = loadKg === null ? null : estimatedOneRepMax(loadKg, reps, rir);
    if (e1rm && (best === null || e1rm.value > best.value)) best = e1rm;
  }
  return best;
}

const asLastTime = (exposure: Exposure | undefined) =>
  exposure === undefined ? null : { at: exposure.finishedAt, sets: exposure.sets };

/** RF-SUG-07 (domain part): the same fold as the suggestion, so it explains exactly that one. */
export function explainSuggestion(
  routineExposures: readonly Exposure[],
  context: SuggestionContext,
): SuggestionExplanation {
  const ordered = orderedContext(context);
  const state = fold(routineExposures, ordered);
  const suggestion = suggest(state, ordered);
  const last = state.records.at(-1);
  const rirs = last?.analysis.rirsWithW ?? [];

  let lastTime = asLastTime(last?.exposure);
  if (last === undefined) {
    const { reason } = suggestion;
    lastTime =
      reason.code === 'ESTIMATED_FROM_E1RM'
        ? asLastTime(
            ordered.exerciseExposures.find(
              (ee) => ee.finishedAt.getTime() === reason.basis.at.getTime(),
            ),
          )
        : reason.code === 'FROM_EXERCISE_HISTORY' || reason.code.startsWith('BODYWEIGHT_')
          ? asLastTime(ordered.exerciseExposures.at(-1))
          : null;
  }

  return {
    suggestion,
    lastTime,
    prescription: context.prescription,
    meanRir: rirs.length === 0 ? null : rirs.reduce((sum, rir) => sum + rir, 0) / rirs.length,
    estimatedMax: lastTime === null ? null : bestE1rm(lastTime.sets),
  };
}

/**
 * A suggestion recalculated by a calibration set of today (RN-SUG-06): its reason is the whole
 * explanation, there is no «last time» yet.
 */
export function explainCalibrationStep(
  base: SuggestionExplanation,
  suggestion: Suggestion,
): SuggestionExplanation {
  return {
    suggestion,
    lastTime: null,
    prescription: base.prescription,
    meanRir: null,
    estimatedMax: null,
  };
}
