import type {
  EffortMode,
  Equipment,
  ExperienceLevel,
  Id,
  LoadUnit,
  TrainingGoal,
} from '@/domain/models/vocabulary';

/** Minimum load jump per equipment, in the unit of the map (RN-PERF-06). Bodyweight has none. */
export type LoadIncrements = Readonly<Record<Exclude<Equipment, 'bodyweight'>, number>>;

/** One per user: `id` is the user id (RN-AUTH-06). */
export interface Profile {
  readonly id: Id;
  readonly level: ExperienceLevel;
  readonly goal: TrainingGoal;
  /** 2–6. */
  readonly daysPerWeek: number;
  readonly unit: LoadUnit;
  readonly effortMode: EffortMode;
  /** The user chose the effort mode by hand: a change of level keeps it (RN-PERF-04). */
  readonly effortModeExplicit: boolean;
  /** One map per unit; changing the unit doesn't convert them (RN-PERF-06). */
  readonly loadIncrementsKg: LoadIncrements;
  readonly loadIncrementsLb: LoadIncrements;
  /**
   * I-01: the active routine lives here, so there is at most one. A weak reference: a missing or
   * deleted routine counts as no active routine (RN-RUT-02).
   */
  readonly activeRoutineId: Id | null;
  readonly onboardingCompletedAt: Date | null;
}
