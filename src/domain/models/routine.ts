import type { Prescription } from '@/domain/models/prescription';
import type { Id } from '@/domain/models/vocabulary';

export interface RoutineExercise {
  readonly id: Id;
  readonly routineDayId: Id;
  /** Reference to the catalog by ID only (06 §2). */
  readonly exerciseId: Id;
  readonly position: number;
  readonly prescription: Prescription;
  readonly notes: string | null;
}

export interface RoutineDay {
  readonly id: Id;
  readonly routineId: Id;
  readonly name: string;
  /** Not compacted when a day is deleted (RN-RUT-01). */
  readonly position: number;
  readonly exercises: readonly RoutineExercise[];
}

/** The routine aggregate (06 §2): it is saved and validated as a whole (I-02, I-03). */
export interface Routine {
  readonly id: Id;
  readonly name: string;
  /** The template it was copied from (RN-RUT-03). */
  readonly sourceTemplateId: Id | null;
  readonly days: readonly RoutineDay[];
}
