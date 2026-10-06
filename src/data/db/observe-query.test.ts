import { observeQuery } from '@/data/db/observe-query';
import { exercises, routineTemplates, workouts } from '@/data/db/schema';
import { ManualTableChanges } from '@/data/db/table-changes';

/** Lets the batched re-run (a microtask) happen. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup(query: () => number = jest.fn(() => 1)) {
  const changes = new ManualTableChanges();
  const observer = { next: jest.fn(), error: jest.fn() };
  const unsubscribe = observeQuery(changes, [exercises, routineTemplates], query, observer);
  return { changes, observer, unsubscribe };
}

describe('observeQuery (ADR-0011 §3)', () => {
  it('emits the query result once on subscribe', () => {
    const { observer } = setup(() => 42);

    expect(observer.next).toHaveBeenCalledTimes(1);
    expect(observer.next).toHaveBeenCalledWith(42);
  });

  it('runs the query again after a change in one of its tables', async () => {
    let value = 1;
    const { changes, observer } = setup(() => value);

    value = 2;
    changes.emit('exercises');
    await flush();

    expect(observer.next).toHaveBeenLastCalledWith(2);
  });

  it('ignores changes in other tables', async () => {
    const { changes, observer } = setup();

    changes.emit('workouts');
    await flush();

    expect(observer.next).toHaveBeenCalledTimes(1);
  });

  it('runs once for a burst of changes (one per row)', async () => {
    const { changes, observer } = setup();

    changes.emit('exercises');
    changes.emit('exercises');
    changes.emit('routine_templates');
    await flush();

    expect(observer.next).toHaveBeenCalledTimes(2);
  });

  it('stops after an error: no more values arrive', async () => {
    let fail = false;
    const { changes, observer } = setup(() => {
      if (fail) throw new Error('disk I/O error');
      return 1;
    });

    fail = true;
    changes.emit('exercises');
    await flush();
    fail = false;
    changes.emit('exercises');
    await flush();

    expect(observer.error).toHaveBeenCalledTimes(1);
    expect(observer.next).toHaveBeenCalledTimes(1);
    expect(changes.listenerCount()).toBe(0);
  });

  it('reports an error of the first run and does not stay subscribed', () => {
    const changes = new ManualTableChanges();
    const observer = { next: jest.fn(), error: jest.fn() };

    observeQuery(
      changes,
      [workouts],
      () => {
        throw new Error('no such table');
      },
      observer,
    );

    expect(observer.error).toHaveBeenCalledTimes(1);
    expect(changes.listenerCount()).toBe(0);
  });

  it('unsubscribing stops the re-runs, also a pending one, and twice has no effect', async () => {
    const { changes, observer, unsubscribe } = setup();

    changes.emit('exercises');
    unsubscribe();
    unsubscribe();
    await flush();

    expect(observer.next).toHaveBeenCalledTimes(1);
    expect(changes.listenerCount()).toBe(0);
  });
});
