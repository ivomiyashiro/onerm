import type { LocalDate } from '@/domain/models/local-date';
import type { Prescription } from '@/domain/models/prescription';
import type { LoadType } from '@/domain/models/vocabulary';
import type { ExposureAnalysis } from '@/domain/rules/suggestion/exposure-analysis';
import type { Exposure } from '@/domain/rules/suggestion/exposures';
import type { LoadGrid } from '@/domain/rules/suggestion/load-grid';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';

/** The inputs of the fold besides the ERR (RN-SUG-17). */
export interface SuggestionContext {
  /** The only date the engine sees (RN-SUG-16); the reentry uses it (RN-SUG-05). */
  readonly today: LocalDate;
  /**
   * The local date of an instant in the device zone (RN-GEN-01). Passed in, so the domain never
   * reads the zone or the clock.
   */
  readonly localDate: (instant: Date) => LocalDate;
  /**
   * Every finished workout of the user, in any routine (RN-SUG-05). Like `exerciseExposures`, the
   * engine orders it by `finishedAt` on entry (`orderedContext`).
   */
  readonly workoutDates: readonly { readonly startedAt: Date; readonly finishedAt: Date }[];
  /** The current prescription of the routine exercise. */
  readonly prescription: Prescription;
  readonly loadType: LoadType;
  readonly grid: LoadGrid;
  /** The EE of the exercise (RN-SUG-01), for the e1RM and as alternative history. */
  readonly exerciseExposures: readonly Exposure[];
}

/** What the fold remembers of one ERR. */
export interface RoutineExposureRecord {
  readonly exposure: Exposure;
  readonly analysis: ExposureAnalysis;
  /** What the engine suggested right before this ERR: recalculated, never stored (RN-SUG-04). */
  readonly suggestionBefore: Suggestion;
  /** RN-SUG-04: the best mark and the count start again at this ERR. */
  readonly isReset: boolean;
  /** RN-SUG-04: the best mark since the last reset, this ERR included. */
  readonly bestMark: PerformanceMark | null;
  /** RN-SUG-04: the ERR in a row that did not improve the best mark. */
  readonly stagnationCount: number;
}

/** RN-SUG-04: W and the mean reps per set with W. */
export interface PerformanceMark {
  readonly loadKg: number;
  readonly meanReps: number;
}

/** The fold state (ADR-0009): the ERR seen so far, in order of `finishedAt`. */
export interface EngineState {
  readonly records: readonly RoutineExposureRecord[];
  /** The last record when it has a W: what priorities 2–9 work on. Built once per step. */
  readonly lastLoaded: LoadedRecord | null;
}

/** A record with its W at hand (external load). */
export type LoadedRecord = RoutineExposureRecord & { readonly workingLoadKg: number };

/** A priority of the decision order: its suggestion, or null when it doesn't apply. */
export type Priority = (state: EngineState, context: SuggestionContext) => Suggestion | null;
