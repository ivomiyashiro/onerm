import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** Something to observe, like a repository's `observe…` bound to its arguments. */
export type Source<T> = (observer: Observer<T>) => Unsubscribe;

type Sources<T extends readonly unknown[]> = { readonly [K in keyof T]: Source<T[K]> };

/**
 * Observes several sources as one: emits their latest values together once every source has one,
 * and again after a change in any. An error in any ends them all (Observer contract).
 */
export function observeTogether<T extends readonly unknown[]>(
  sources: Sources<T>,
  observer: Observer<T>,
): Unsubscribe {
  const latest: unknown[] = [];
  const received = new Set<number>();
  let active = true;

  // The first query runs while subscribing (observeQuery), so an error can come before every
  // subscription exists: `stop` only cancels the ones already made.
  const subscriptions: Unsubscribe[] = [];
  const stop = () => {
    active = false;
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };

  for (const [index, source] of (sources as readonly Source<unknown>[]).entries()) {
    subscriptions.push(
      source({
        next: (value) => {
          if (!active) return;
          latest[index] = value;
          received.add(index);
          if (received.size === sources.length) observer.next([...latest] as unknown as T);
        },
        error: (error) => {
          if (!active) return;
          stop();
          observer.error(error);
        },
      }),
    );
    if (!active) break;
  }
  if (!active) stop();
  return stop;
}

/** The current value of a source, for a command that reads before it writes. */
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
