import type { ExerciseAttribution } from '@/domain/models/exercise';
import type { Equipment, LoadType, Mechanic, Muscle } from '@/domain/models/vocabulary';

/**
 * What a source can say about an exercise, already in our vocabularies (ADR-0004 §2). Whatever the
 * source can't know (the mechanic, whether it is unilateral, machine or cable) is left out and
 * comes from the curation.
 */
export interface ExerciseCandidate {
  readonly source: string;
  readonly externalId: string;
  /** Spanish name; null when the source has none (the curation may supply it, R2). */
  readonly name: string | null;
  readonly aliases: readonly string[];
  readonly loadType: LoadType;
  readonly primaryMuscles: readonly Muscle[];
  readonly secondaryMuscles: readonly Muscle[];
  readonly primaryEquipment: Equipment | null;
  readonly equipment: readonly Equipment[];
  readonly mechanic: Mechanic | null;
  readonly isUnilateral: boolean | null;
  readonly description: string | null;
  readonly attribution: ExerciseAttribution;
}

/** A taxonomy value without a mapping is rejected with a reason, never dropped silently. */
export type MapResult =
  | { readonly ok: true; readonly candidate: ExerciseCandidate }
  | { readonly ok: false; readonly externalId: string; readonly reason: string };

/** The port every source implements (ADR-0004 §2): the pipeline knows nothing about wger. */
export interface ExerciseSourceAdapter {
  readonly sourceId: string;
  extract(): AsyncIterable<unknown>;
  map(raw: unknown): MapResult;
}
