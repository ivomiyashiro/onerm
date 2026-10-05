import type { ExerciseRole } from '@/domain/models/vocabulary';

/** Floor and cap of the target reps (glossary). */
export interface RepRange {
  readonly min: number;
  readonly max: number;
}

/** What a routine exercise asks for; limits in RN-RUT-04 (I-03). */
export interface Prescription {
  readonly role: ExerciseRole;
  readonly sets: number;
  readonly repRange: RepRange;
  readonly restSeconds: number;
  readonly targetRir: number;
}
