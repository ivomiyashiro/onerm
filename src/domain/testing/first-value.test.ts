import type { Observer, Unsubscribe } from '@/domain/observer';
import { firstValue } from '@/domain/testing/first-value';

/** A source with a first value, or one that fails while subscribing. */
function aSource<T>(options: { initial?: T; failOnSubscribe?: boolean } = {}) {
  const observers = new Set<Observer<T>>();
  return {
    observe(observer: Observer<T>): Unsubscribe {
      if (options.failOnSubscribe) {
        observer.error(new Error('disk'));
        return () => {};
      }
      observers.add(observer);
      if ('initial' in options) observer.next(options.initial as T);
      return () => observers.delete(observer);
    },
    subscribers: () => observers.size,
  };
}

describe('firstValue', () => {
  it('resolves with the first value and stops observing', async () => {
    const a = aSource<number>({ initial: 1 });

    await expect(firstValue(a.observe)).resolves.toBe(1);
    expect(a.subscribers()).toBe(0);
  });

  it('rejects with the error of the source', async () => {
    const a = aSource<number>({ failOnSubscribe: true });

    await expect(firstValue(a.observe)).rejects.toThrow('disk');
  });
});
