import type { Exercise } from '@/domain/models/exercise';
import type { Id } from '@/domain/models/vocabulary';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** The catalog: read-only for the app (06 §2). Includes deprecated exercises (RN-CAT-01). */
export interface ExerciseRepository {
  observeAll(observer: Observer<Exercise[]>): Unsubscribe;
  /** Null when the id is not in the local catalog yet (RN-CAT-04). */
  observeById(id: Id, observer: Observer<Exercise | null>): Unsubscribe;
}
