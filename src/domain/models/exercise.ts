import type { Equipment, Id, LoadType, Mechanic, Muscle } from '@/domain/models/vocabulary';

/** Where a catalog entry comes from, shown as «Fuente: {fuente} · {licencia}» (RF-CAT-02 AC1). */
export interface ExerciseAttribution {
  readonly source: string;
  readonly license: string;
  /** The attribution text the license asks for (authors, link). */
  readonly attribution: string;
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
  readonly description: string | null;
  readonly attributions: readonly ExerciseAttribution[];
  /** Deprecated exercises are never deleted (RN-CAT-01): they leave the search only. */
  readonly deprecatedAt: Date | null;
}
