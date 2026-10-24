import type {
  Equipment,
  Id,
  LoadType,
  Machine,
  Mechanic,
  Muscle,
} from '@/domain/models/vocabulary';

/** Where a catalog entry comes from, shown as «Fuente: {fuente} · {licencia}» (RF-CAT-02 AC1). */
export interface ExerciseAttribution {
  readonly source: string;
  readonly license: string;
  /** The attribution text the license asks for (authors, link). */
  readonly attribution: string;
}

/** How an exercise is done (RF-CAT-02, #306): numbered steps and the usual mistakes. */
export interface ExerciseTechnique {
  readonly steps: readonly string[];
  readonly mistakes: readonly string[];
}

/**
 * Exercise from the catalog: the canonical model (06 §3, ADR-0004). `loadType`, `isUnilateral`
 * and `primaryEquipment` never change once published (RN-CAT-05).
 */
export interface Exercise {
  readonly id: Id;
  readonly slug: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly loadType: LoadType;
  readonly primaryMuscles: readonly Muscle[];
  readonly secondaryMuscles: readonly Muscle[];
  /** Defines the load increment (RN-PERF-06). */
  readonly primaryEquipment: Equipment;
  /** For the filters (RN-CAT-03). */
  readonly equipment: readonly Equipment[];
  readonly mechanic: Mechanic;
  readonly isUnilateral: boolean;
  /** Null while the team hasn't written it: the section is hidden (RF-CAT-02 AC3). */
  readonly technique: ExerciseTechnique | null;
  /** Which machine to look for, shown as a picture; null when it isn't a machine. */
  readonly machine: Machine | null;
  /** A curated video; without one the app searches YouTube (RF-CAT-02 AC5). */
  readonly videoUrl: string | null;
  readonly attributions: readonly ExerciseAttribution[];
  /** Deprecated exercises are never deleted (RN-CAT-01): they leave the search only. */
  readonly deprecatedAt: Date | null;
}
