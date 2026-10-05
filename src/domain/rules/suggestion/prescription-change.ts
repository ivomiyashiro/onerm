import type { Prescription } from '@/domain/models/prescription';
import type { Priority } from '@/domain/rules/suggestion/engine-types';
import { nearestOnGrid } from '@/domain/rules/suggestion/load-grid';
import { lastLoadedRecord } from '@/domain/rules/suggestion/progression';
import { withReentry } from '@/domain/rules/suggestion/reentry';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';
import { estimateFromE1rm, latestE1rm } from '@/domain/rules/suggestion/without-routine-history';

/** RN-SUG-14: only the range or the target RIR count; a change in the sets alone doesn't. */
function rangeOrEffortChanged(current: Prescription, reference: Prescription): boolean {
  return (
    current.repRange.min !== reference.repRange.min ||
    current.repRange.max !== reference.repRange.max ||
    current.targetRir !== reference.targetRir
  );
}

/**
 * 2. Prescription changed (RN-SUG-14): estimate again for the current prescription with the
 * e1RM of the latest EE that has one (RN-SUG-08). Without it, or if the estimation doesn't apply,
 * W with the floor of the current range. Then the reentry, as a modifier.
 */
export const prescriptionChanged: Priority = (state, context) => {
  const last = lastLoadedRecord(state);
  if (last === null || !rangeOrEffortChanged(context.prescription, last.exposure.prescription)) {
    return null;
  }
  const { workingLoadKg } = last;
  const estimate = latestE1rm(context.exerciseExposures);
  const estimated = estimate && estimateFromE1rm(estimate, context.prescription, context.grid);
  const suggestion: Suggestion = estimated
    ? {
        ...estimated,
        reason: {
          code: 'PRESCRIPTION_CHANGED',
          e1rm: estimate.e1rm,
          workingLoadKg,
          limitingSide: last.analysis.limitingSide,
        },
      }
    : {
        loadKg: nearestOnGrid(workingLoadKg, context.grid),
        reps: context.prescription.repRange.min,
        reason: {
          code: 'PRESCRIPTION_CHANGED',
          e1rm: null,
          workingLoadKg,
          limitingSide: last.analysis.limitingSide,
        },
      };
  // The base of the reentry is the last ERR (RN-SUG-05).
  return withReentry(suggestion, last.exposure.finishedAt, context);
};
