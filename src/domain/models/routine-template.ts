import type { ExerciseRole, ExperienceLevel, Id } from '@/domain/models/vocabulary';

/** Structure only: the prescription is computed when the template is adopted (RN-PERF-03). */
export interface TemplateExercise {
  readonly id: Id;
  readonly exerciseId: Id;
  readonly position: number;
  readonly role: ExerciseRole;
  readonly sets: number;
}

export interface TemplateDay {
  readonly id: Id;
  readonly name: string;
  readonly position: number;
  readonly exercises: readonly TemplateExercise[];
}

/** A predefined routine of the catalog (11 §3), like PLT-FB3. */
export interface RoutineTemplate {
  readonly id: Id;
  readonly name: string;
  /** Suggested level. */
  readonly level: ExperienceLevel;
  readonly daysPerWeek: number;
  readonly estimatedMinutes: number;
  /** The «¿Por qué esta rutina?» text, with references to P-NN. */
  readonly rationale: string;
  readonly days: readonly TemplateDay[];
}
