import type { RejectedChange } from '@/domain/models/rejected-change';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** The changes the server rejected (RN-SYNC-11, RF-SYNC-06.AC4). */
export interface RejectedChangeRepository {
  observe(observer: Observer<RejectedChange[]>): Unsubscribe;
  /**
   * «Descartar este cambio»: back to the server's version if it has one (that needs the
   * connection), or deleted with the records under it if it never reached the server.
   */
  discard(change: RejectedChange): Promise<'done' | 'offline'>;
  /** «Reintentar»: the change is pending again, without its conflict. */
  retry(change: RejectedChange): Promise<void>;
}
