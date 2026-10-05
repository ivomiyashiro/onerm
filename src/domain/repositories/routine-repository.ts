import type { Routine } from '@/domain/models/routine';
import type { Id } from '@/domain/models/vocabulary';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/**
 * The routine aggregate is read and written as a whole (06 §2). Days and exercises are ordered
 * with `byPosition` (I-10); deleted ones are never emitted.
 */
export interface RoutineRepository {
  observeAll(observer: Observer<Routine[]>): Unsubscribe;
  /** Emits null if the routine doesn't exist or was deleted (weak reference, RN-RUT-02). */
  observeById(id: Id, observer: Observer<Routine | null>): Unsubscribe;
  /** Callers validate first with `validateRoutine` (I-02, I-03). */
  save(routine: Routine): Promise<void>;
  /** Logical delete of the routine with its days and exercises (I-07); history stays (I-08). */
  delete(id: Id): Promise<void>;
}
