import type { Id } from '@/domain/models/vocabulary';
import type { Prescription } from '@/domain/models/prescription';
import type { WorkoutSet } from '@/domain/models/workout';
import { limitingSide } from '@/domain/rules/limiting-side';
import { sortByPosition } from '@/domain/rules/position-order';
import { suggestAfterCalibrationSet } from '@/domain/rules/suggestion/calibration';
import type { LoadGrid } from '@/domain/rules/suggestion/load-grid';
import type { Suggestion, SuggestionCode } from '@/domain/rules/suggestion/suggestion';

/** The suggestion for the next set of an exercise, with the sets of this workout. */
export interface CurrentSuggestion {
  readonly suggestion: Suggestion;
  /** It comes from the last set logged: the next set shows it as is (RN-ENT-04). */
  readonly recalculated: boolean;
  /** A calibration set without its effort: the next set waits for it (RF-SUG-02.AC4). */
  readonly awaitingEffort: WorkoutSet | null;
}

export interface CurrentSuggestionInput {
  readonly exerciseId: Id;
  readonly prescription: Prescription;
  /** Null for bodyweight. */
  readonly grid: LoadGrid | null;
}

/** The codes of an external-load calibration still going on (RN-SUG-06). */
const CALIBRATING: ReadonlySet<SuggestionCode> = new Set([
  'CALIBRATION',
  'CALIBRATION_STEP',
  'CALIBRATION_STEP_DOWN',
]);

/** RN-ENT-02: the effort is required in calibration, except with 0 reps. */
function needsEffort(set: WorkoutSet): boolean {
  if (!set.isUnilateral) return set.reps > 0 && set.rir === null;
  return limitingSide(set).reps > 0 && (set.rirLeft === null || set.rirRight === null);
}

/** The reps the engine reads from a set: a unilateral one by its limiting side (RN-ENT-06). */
const repsOf = (set: WorkoutSet) => (set.isUnilateral ? limitingSide(set).reps : set.reps);

/**
 * RN-SUG-13: inside a workout the suggestion is not recalculated set by set, except in calibration.
 * There each effective set gives the next one (RN-SUG-06) until the calibration ends. In a
 * bodyweight calibration the next sets take the reps of the first (RF-SUG-09.AC4).
 */
export function currentSuggestion(
  base: Suggestion,
  sets: readonly WorkoutSet[],
  { exerciseId, prescription, grid }: CurrentSuggestionInput,
): CurrentSuggestion {
  const working = sortByPosition(sets).filter((set) => !set.isWarmup);
  const unchanged = { suggestion: base, recalculated: false, awaitingEffort: null };
  if (working.length === 0) return unchanged;

  if (base.reason.code === 'BODYWEIGHT_CALIBRATION') {
    return {
      suggestion: { ...base, reps: repsOf(working[0]) },
      recalculated: true,
      awaitingEffort: null,
    };
  }
  if (grid === null || !CALIBRATING.has(base.reason.code)) return unchanged;

  let suggestion = base;
  for (const [index, set] of working.entries()) {
    if (needsEffort(set)) return { suggestion, recalculated: false, awaitingEffort: set };
    suggestion = suggestAfterCalibrationSet({ set, exerciseId, prescription, grid });
    if (!CALIBRATING.has(suggestion.reason.code)) {
      return { suggestion, recalculated: index === working.length - 1, awaitingEffort: null };
    }
  }
  return { suggestion, recalculated: true, awaitingEffort: null };
}
