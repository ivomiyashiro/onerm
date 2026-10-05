import type { Exercise } from '@/domain/models/exercise';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** The catalog: read-only for the app (06 §2). Includes deprecated exercises (RN-CAT-01). */
export interface ExerciseRepository {
  observeAll(observer: Observer<Exercise[]>): Unsubscribe;
}
