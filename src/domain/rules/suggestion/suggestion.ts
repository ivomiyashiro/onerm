import type { Id } from '@/domain/models/vocabulary';
import type { E1rm } from '@/domain/rules/suggestion/e1rm';

/** RN-SUG-11: every reason code. The texts live in presentation (13 §4). */
export const SUGGESTION_CODES = [
  'CALIBRATION',
  'CALIBRATION_STEP',
  'CALIBRATION_STEP_DOWN',
  'ESTIMATED_FROM_E1RM',
  'FROM_EXERCISE_HISTORY',
  'PRESCRIPTION_CHANGED',
  'REENTRY',
  'DELOAD',
  'CONSOLIDATE',
  'EARLY_INCREASE',
  'HIGH_INCREASE',
  'INCREASE_LOAD',
  'EXTEND_REPS',
  'ADD_REP',
  'COMPLETE_SETS',
  'REPEAT',
  'BODYWEIGHT_CALIBRATION',
  'BODYWEIGHT_ADD_REP',
  'BODYWEIGHT_READY',
] as const;
export type SuggestionCode = (typeof SUGGESTION_CODES)[number];

/** The limiting side of a unilateral set (RN-SUG-11); null for a bilateral one. */
export type Side = 'left' | 'right' | null;

/** «Tomamos tu lado {lado}, que hizo {reps}» (13 §4). */
export interface LimitingSide {
  readonly side: 'left' | 'right';
  readonly reps: number;
}

/** What the reasons of double progression and effort share: the last ERR. */
interface ProgressionParams {
  /** W of the last ERR. */
  readonly workingLoadKg: number;
  /** In a unilateral exercise (RN-SUG-11). */
  readonly limitingSide: LimitingSide | null;
}

/** RN-SUG-05: the inactivity gap and how much it lowers the load. */
export interface Reentry {
  readonly gapDays: number;
  readonly decreasePercent: number;
}

/** The set an estimate comes from: «lo que hiciste en {ejercicio} el {fecha}». */
export interface EstimateBasis {
  readonly exerciseId: Id;
  readonly at: Date;
  readonly loadKg: number;
  readonly reps: number;
  readonly side: Side;
}

/**
 * Why the engine suggests what it does: a code and the parameters its texts need (RN-SUG-11,
 * 13 §4). The prescription (floor, cap, target RIR) and the suggested load are not repeated here.
 */
export type SuggestionReason =
  | { readonly code: 'CALIBRATION' }
  | { readonly code: 'BODYWEIGHT_CALIBRATION' }
  | {
      readonly code: 'CALIBRATION_STEP';
      readonly reps: number;
      readonly rir: number | null;
      readonly repsToFailure: number;
      readonly side: Side;
    }
  | { readonly code: 'CALIBRATION_STEP_DOWN'; readonly side: Side }
  | {
      readonly code: 'ESTIMATED_FROM_E1RM';
      readonly e1rm: E1rm;
      readonly basis: EstimateBasis;
      /** The reentry also lowered this estimate (RN-SUG-05, 13 §4 «Reentrada combinada»). */
      readonly withReentry?: Reentry;
    }
  | {
      readonly code: 'FROM_EXERCISE_HISTORY';
      readonly workingLoadKg: number;
      /** In a unilateral exercise (RN-SUG-11). */
      readonly limitingSide: LimitingSide | null;
      readonly withReentry?: Reentry;
    }
  | {
      readonly code: 'PRESCRIPTION_CHANGED';
      /** Null when there was no e1RM to estimate from: W with the new floor (RN-SUG-14). */
      readonly e1rm: E1rm | null;
      readonly workingLoadKg: number;
      /** In a unilateral exercise (RN-SUG-11): the side of the last ERR. */
      readonly limitingSide: LimitingSide | null;
      readonly withReentry?: Reentry;
    }
  | ({ readonly code: 'REENTRY' } & Reentry & ProgressionParams)
  | ({
      readonly code: 'DELOAD';
      readonly stagnantExposures: number;
      readonly bestMark: { readonly loadKg: number; readonly meanReps: number };
    } & ProgressionParams)
  | ({
      readonly code: 'INCREASE_LOAD';
      readonly increasePercent: number;
      /** The jump was over 10 %: the reps went over the cap first (13 §4). */
      readonly afterOvershoot: boolean;
    } & ProgressionParams)
  | ({
      readonly code: 'EXTEND_REPS';
      readonly nextLoadKg: number;
      readonly increasePercent: number;
    } & ProgressionParams)
  | ({ readonly code: 'ADD_REP'; readonly previousReps: number } & ProgressionParams)
  | ({ readonly code: 'COMPLETE_SETS' } & ProgressionParams)
  | ({ readonly code: 'REPEAT' } & ProgressionParams)
  | ({ readonly code: 'CONSOLIDATE'; readonly meanRir: number } & ProgressionParams)
  | ({ readonly code: 'EARLY_INCREASE'; readonly meanRir: number } & ProgressionParams)
  | ({ readonly code: 'HIGH_INCREASE'; readonly meanRir: number } & ProgressionParams)
  | {
      readonly code: 'BODYWEIGHT_ADD_REP';
      readonly previousReps: number;
      readonly limitingSide: LimitingSide | null;
    }
  | { readonly code: 'BODYWEIGHT_READY'; readonly limitingSide: LimitingSide | null };

/**
 * What the engine proposes for a routine exercise (glossary). The load is in kg and on the grid
 * of the user unit (RN-SUG-09); null when the user picks it (calibration) or for bodyweight.
 */
export interface Suggestion {
  readonly loadKg: number | null;
  readonly reps: number;
  readonly reason: SuggestionReason;
}
