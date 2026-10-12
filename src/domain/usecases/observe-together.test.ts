import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import { firstValue, observeTogether } from '@/domain/usecases/observe-together';

/** A source the test drives by hand; `failOnSubscribe` errors during the subscribe call itself. */
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
    emit: (value: T) => observers.forEach((o) => o.next(value)),
    fail: () => observers.forEach((o) => o.error(new Error('disk'))),
    subscribers: () => observers.size,
  };
}

function record<T>() {
  const values: T[] = [];
  const error = jest.fn();
  return { observer: { next: (value: T) => values.push(value), error }, values, error };
}

describe('observeTogether', () => {
  it('emits the values together once every source has one, and after each change', () => {
    const a = aSource<number>();
    const b = aSource<string>({ initial: 'x' });
    const { observer, values } = record<[number, string]>();

    observeTogether([a.observe, b.observe], observer);
    expect(values).toEqual([]);
    a.emit(1);
    b.emit('y');

    expect(values).toEqual([
      [1, 'x'],
      [1, 'y'],
    ]);
  });

  it('an error in one source ends every observation', () => {
    const a = aSource<number>({ initial: 1 });
    const b = aSource<number>({ initial: 2 });
    const { observer, error } = record<[number, number]>();

    observeTogether([a.observe, b.observe], observer);
    a.fail();

    expect(error).toHaveBeenCalledTimes(1);
    expect(b.subscribers()).toBe(0);
  });

  it('an error while subscribing never subscribes the rest', () => {
    const a = aSource<number>({ failOnSubscribe: true });
    const b = aSource<number>({ initial: 2 });
    const { observer, error } = record<[number, number]>();

    observeTogether([a.observe, b.observe], observer);

    expect(error).toHaveBeenCalledTimes(1);
    expect(b.subscribers()).toBe(0);
  });

  it('unsubscribing stops every observation', () => {
    const a = aSource<number>({ initial: 1 });
    const b = aSource<number>({ initial: 2 });
    const { observer, values } = record<[number, number]>();

    observeTogether([a.observe, b.observe], observer)();
    a.emit(3);

    expect(values).toEqual([[1, 2]]);
    expect(a.subscribers() + b.subscribers()).toBe(0);
  });
});

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
