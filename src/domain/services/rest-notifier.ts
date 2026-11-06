import type { RestMessage } from '@/domain/models/rest-timer';

/**
 * The local notification at the end of the rest (RN-ENT-07). It always uses the same identifier:
 * scheduling again replaces the previous one, and cancelling leaves none (spike #14).
 */
export interface RestNotifier {
  schedule(at: Date, message: RestMessage): Promise<void>;
  cancel(): Promise<void>;
}
