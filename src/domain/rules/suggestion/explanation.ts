import type { Prescription } from '@/domain/models/prescription';
import { fold, suggest } from '@/domain/rules/suggestion/engine';
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
}

const asLastTime = (exposure: Exposure | undefined) =>
  exposure === undefined ? null : { at: exposure.finishedAt, sets: exposure.sets };

/** RF-SUG-07 (domain part): the same fold as the suggestion, so it explains exactly that one. */
export function explainSuggestion(
  routineExposures: readonly Exposure[],
  context: SuggestionContext,
): SuggestionExplanation {
  const state = fold(routineExposures, context);
  const suggestion = suggest(state, context);
  const last = state.records.at(-1);
  const rirs = last?.analysis.rirsWithW ?? [];

  let lastTime = asLastTime(last?.exposure);
  if (last === undefined) {
    const { reason } = suggestion;
    lastTime =
      reason.code === 'ESTIMATED_FROM_E1RM'
        ? asLastTime(context.exerciseExposures.find((ee) => ee.finishedAt === reason.basis.at))
        : reason.code === 'FROM_EXERCISE_HISTORY' || reason.code.startsWith('BODYWEIGHT_')
          ? asLastTime(context.exerciseExposures.at(-1))
          : null;
  }

  return {
    suggestion,
    lastTime,
    prescription: context.prescription,
    meanRir: rirs.length === 0 ? null : rirs.reduce((sum, rir) => sum + rir, 0) / rirs.length,
  };
}
