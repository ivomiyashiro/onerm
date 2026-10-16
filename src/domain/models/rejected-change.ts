/** The kinds of synced records, one per user table (07 §2.2). */
export type RecordKind =
  | 'profile'
  | 'routine'
  | 'routineDay'
  | 'routineExercise'
  | 'workout'
  | 'workoutExercise'
  | 'workoutSet';

/** A change the server rejected (RN-SYNC-11), as S25 and D12 show it. */
export interface RejectedChange {
  kind: RecordKind;
  id: string;
  /** The server's reason: the Postgres code (`23514`, `42501`…). */
  reason: string;
  /** The name the record shows, when it has one (a routine, a day, a workout's day). */
  name: string | null;
  /** It reached the server before: discarding goes back to the server's version. */
  uploadedBefore: boolean;
  /** Records under it that never reached the server: discarding deletes them too (D12). */
  dependents: number;
}
