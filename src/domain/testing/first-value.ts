import type { Unsubscribe } from '@/domain/observer';
import type { Source } from '@/domain/usecases/shared/observe-together';

/**
 * The current value of a source: what a test or `tools/perf` reads from an `observe…`. Commands
 * read with the repositories' `get…` methods instead (#341). Used by tests only.
 */
export function firstValue<T>(source: Source<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let done = false;
    // The value can arrive while subscribing, before `source` returns: then it is stopped below.
    const subscription: { stop?: Unsubscribe } = {};
    const settle = (finish: () => void) => {
      if (done) return;
      done = true;
      finish();
      subscription.stop?.();
    };
    subscription.stop = source({
      next: (value) => settle(() => resolve(value)),
      error: (error) => settle(() => reject(error)),
    });
    if (done) subscription.stop();
  });
}
