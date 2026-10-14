import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
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
}

/**
 * S18 (RF-PROG-01): the finished workouts, newest first, from the local data (RN-SYNC-10). The
 * workout in progress is never history.
 */
export class ObserveHistory {
  constructor(private readonly workouts: Pick<WorkoutRepository, 'observeFinished'>) {}

  execute(observer: Observer<HistoryItem[]>): Unsubscribe {
    return this.workouts.observeFinished({
      next: (finished) => observer.next(historyOf(finished)),
      error: observer.error,
    });
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
    }))
    .sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime() || (a.id < b.id ? 1 : -1));
}
