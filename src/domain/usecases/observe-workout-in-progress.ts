import type { Workout } from '@/domain/models/workout';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';

/**
 * The workout in progress, or null (RN-ENT-01): the central tab button and S07 show «Continuar»
 * with its time (RF-ENT-01.AC4). Without the suggestions of ObserveWorkout, so it stays cheap.
 */
export class ObserveWorkoutInProgress {
  constructor(private readonly workouts: Pick<WorkoutRepository, 'observeInProgress'>) {}

  execute(observer: Observer<Workout | null>): Unsubscribe {
    return this.workouts.observeInProgress(observer);
  }
}
