import { daysBetween } from '@/domain/rules/calendar';
import type { Priority, SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import { firstFinishedFrom } from '@/domain/rules/suggestion/history-order';
import { decreaseLoad } from '@/domain/rules/suggestion/load-grid';
import { SUGGESTION_PARAMETERS } from '@/domain/rules/suggestion/parameters';
import { lastLoadedRecord } from '@/domain/rules/suggestion/progression';
import type { Reentry, Suggestion } from '@/domain/rules/suggestion/suggestion';

const { REENTRY_1, REENTRY_2 } = SUGGESTION_PARAMETERS;

/**
 * RN-SUG-05: the biggest interval, in local days, between consecutive finished workouts of the
 * user (any routine), or between the last one and today, from the base exposure on. So a long
 * rotation without a pause is not a gap (caso O), and each exercise gets the reentry the first
 * time it comes back after one.
 */
export function inactivityGapDays(baseFinishedAt: Date, context: SuggestionContext): number {
  const { workoutDates, localDate } = context;
  // workoutDates is ordered by finishedAt (orderedContext): the ones from the base on are a suffix.
  let previous = localDate(baseFinishedAt);
  let gap = 0;
  for (let i = firstFinishedFrom(workoutDates, baseFinishedAt); i < workoutDates.length; i++) {
    const date = localDate(workoutDates[i].finishedAt);
    gap = Math.max(gap, daysBetween(previous, date));
    previous = date;
  }
  return Math.max(gap, daysBetween(previous, context.today));
}

/** RN-SUG-05: more than 42 days → −20 %; more than 21 → −10 %; otherwise none. */
export function reentryFor(baseFinishedAt: Date, context: SuggestionContext): Reentry | null {
  // No gap is longer than the whole span from the base to today: most of the time that settles
  // it without walking the workouts (RNF-13).
  const span = daysBetween(context.localDate(baseFinishedAt), context.today);
  if (span <= REENTRY_1.gapDays) return null;
  const gapDays = inactivityGapDays(baseFinishedAt, context);
  if (gapDays > REENTRY_2.gapDays) return { gapDays, decreasePercent: REENTRY_2.decrease };
  if (gapDays > REENTRY_1.gapDays) return { gapDays, decreasePercent: REENTRY_1.decrease };
  return null;
}

/**
 * The reentry as a modifier of priorities 1 and 2: their load goes down with `bajada` and the
 * reason carries `withReentry` (RN-SUG, «Orden de decisión»). Nothing to lower in a calibration.
 */
export function withReentry<S extends Suggestion>(
  suggestion: S,
  baseFinishedAt: Date,
  context: SuggestionContext,
): S {
  const reentry = reentryFor(baseFinishedAt, context);
  if (reentry === null || suggestion.loadKg === null) return suggestion;
  return {
    ...suggestion,
    loadKg: decreaseLoad(suggestion.loadKg, reentry.decreasePercent, context.grid),
    reason: { ...suggestion.reason, withReentry: reentry },
  };
}

/** 3. Reentry after a pause (RN-SUG-05): bajada(W, p) from the last ERR, with the floor. */
export const reentry: Priority = (state, context) => {
  const last = lastLoadedRecord(state);
  if (last === null) return null;
  const found = reentryFor(last.exposure.finishedAt, context);
  if (found === null) return null;
  const { workingLoadKg, analysis } = last;
  return {
    loadKg: decreaseLoad(workingLoadKg, found.decreasePercent, context.grid),
    reps: analysis.repRange.min,
    reason: { code: 'REENTRY', ...found, workingLoadKg, limitingSide: analysis.limitingSide },
  };
};
