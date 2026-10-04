import type { Exercise } from '@/domain/models/exercise';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

export interface ExerciseRepository {
  observeAll(observer: Observer<Exercise[]>): Unsubscribe;
}
