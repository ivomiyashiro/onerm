import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { SyncStateRepository } from '@/domain/repositories/sync-state-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { recordsByWorkout } from '@/domain/rules/progress/personal-records';
import { effectiveSets, workoutMinutes } from '@/domain/rules/progress/workout-stats';
import { exerciseExposures } from '@/domain/rules/suggestion/exposures';

/** A row of S18 · Historial (RF-PROG-01.AC1). */
export interface HistoryItem {
  readonly id: Id;
  readonly finishedAt: Date;
  readonly dayName: string;
  readonly routineName: string;
  readonly minutes: number;
  readonly sets: number;
  /** RN-PROG-03 (a) and (b) beaten in it, as S12 highlights them. */
  readonly records: number;
  /** RF-PROG-01.AC2: an account's workout not backed up yet. */
  readonly pending: boolean;
}

/**
 * S18 (RF-PROG-01): the finished workouts, newest first, from the local data (RN-SYNC-10). The
 * workout in progress is never history.
 */
export class ObserveHistory {
  constructor(
    private readonly workouts: Pick<WorkoutRepository, 'observeFinished'>,
    private readonly syncState: Pick<SyncStateRepository, 'observePendingWorkouts'>,
  ) {}

  execute(observer: Observer<HistoryItem[]>): Unsubscribe {
    let history: HistoryItem[] | null = null;
    let pending: ReadonlySet<Id> = new Set();
    // The history is folded once per change of the workouts; a backup only flips the marks.
    const emit = () => {
      if (history)
        observer.next(history.map((item) => ({ ...item, pending: pending.has(item.id) })));
    };
    const stopPending = this.syncState.observePendingWorkouts({
      next: (ids) => {
        pending = ids;
        emit();
      },
      error: observer.error,
    });
    const stopWorkouts = this.workouts.observeFinished({
      next: (finished) => {
        history = historyOf(finished);
        emit();
      },
      error: observer.error,
    });
    return () => {
      stopPending();
      stopWorkouts();
    };
  }
}

function historyOf(finished: readonly Workout[]): HistoryItem[] {
  const records = new Map<Id, number>();
  const exerciseIds = new Set(finished.flatMap((w) => w.exercises.map((e) => e.exerciseId)));
  for (const exerciseId of exerciseIds) {
    for (const [workoutId, n] of recordsByWorkout(exerciseExposures(exerciseId, finished))) {
      records.set(workoutId, (records.get(workoutId) ?? 0) + n);
    }
  }
  return finished
    .filter((w): w is Workout & { finishedAt: Date } => w.finishedAt !== null)
    .map((w) => ({
      id: w.id,
      finishedAt: w.finishedAt,
      dayName: w.dayNameSnapshot,
      routineName: w.routineNameSnapshot,
      minutes: workoutMinutes(w),
      sets: effectiveSets(w),
      records: records.get(w.id) ?? 0,
      pending: false,
    }))
    .sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime() || (a.id < b.id ? 1 : -1));
}
