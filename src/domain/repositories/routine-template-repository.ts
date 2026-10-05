import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** Templates of the catalog: read-only for the app (06 §2). */
export interface RoutineTemplateRepository {
  observeAll(observer: Observer<RoutineTemplate[]>): Unsubscribe;
}
