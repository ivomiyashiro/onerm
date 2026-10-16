import type { RejectedChange } from '@/domain/models/rejected-change';
import { dialogs } from '@/presentation/strings/dialogs';
import { profile } from '@/presentation/strings/profile';

const { record, reason } = profile.conflicts;

/** The record a rejected change is about (S25). */
export function rejectedChangeLabel({ kind, name }: RejectedChange): string {
  switch (kind) {
    case 'profile':
      return record.profile;
    case 'routine':
      return record.routine(name);
    case 'routineDay':
      return record.routineDay(name);
    case 'routineExercise':
      return record.routineExercise;
    case 'workout':
      return record.workout(name);
    case 'workoutExercise':
      return record.workoutExercise;
    case 'workoutSet':
      return record.workoutSet;
  }
}

/** Why the server rejected it, from its Postgres code (D12 {detalle}). */
export function rejectedChangeDetail({ reason: code }: RejectedChange): string {
  if (code === '23514') return reason.outOfRange;
  if (code === '23502') return reason.missingValue;
  if (code === '23503') return reason.missingParent;
  if (code === '23505') return reason.duplicate;
  if (code === '42501') return reason.notAllowed;
  return reason.other;
}

/** D12's body: the reason and what discarding does (RN-SYNC-11). */
export function rejectedChangeBody(change: RejectedChange): string {
  return dialogs.D12.body(
    rejectedChangeDetail(change),
    change.uploadedBefore ? null : change.dependents,
  );
}
