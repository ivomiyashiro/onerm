import { workouts, workoutSets } from '@/data/db/schema';
import { sharedQuery } from '@/data/db/shared-query';
import { ManualTableChanges } from '@/data/db/table-changes';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setUp() {
  const changes = new ManualTableChanges();
  let fingerprint = 'v1';
  let value = 1;
  const query = jest.fn(() => value);
  const observe = sharedQuery(changes, [workouts, workoutSets], () => fingerprint, query);
  const watch = () => {
    const values: number[] = [];
    const stop = observe({ next: (v) => values.push(v), error: jest.fn() });
    return { values, stop };
  };
  return {
    changes,
    query,
    watch,
    change(next: { fingerprint: string; value: number }) {
      fingerprint = next.fingerprint;
      value = next.value;
    },
  };
}

describe('sharedQuery (#141)', () => {
  it('one read for every observer; each gets the value at once', () => {
    const { query, watch } = setUp();

    const a = watch();
    const b = watch();

    expect(query).toHaveBeenCalledTimes(1);
    expect(a.values).toEqual([1]);
    expect(b.values).toEqual([1]);
  });

  it('a change that leaves the fingerprint as it was reads nothing and emits nothing', async () => {
    const { changes, query, watch } = setUp();
    const a = watch();

    changes.emit('workout_sets');
    await flush();

    expect(query).toHaveBeenCalledTimes(1);
    expect(a.values).toEqual([1]);
  });

  it('a new fingerprint reads again, once, and tells every observer', async () => {
    const { changes, query, watch, change } = setUp();
    const a = watch();
    const b = watch();

    change({ fingerprint: 'v2', value: 2 });
    changes.emit('workouts');
    changes.emit('workout_sets');
    await flush();

    expect(query).toHaveBeenCalledTimes(2);
    expect(a.values).toEqual([1, 2]);
    expect(b.values).toEqual([1, 2]);
  });

  it('changes in other tables are ignored', async () => {
    const { changes, query, watch, change } = setUp();
    watch();

    change({ fingerprint: 'v2', value: 2 });
    changes.emit('routines');
    await flush();

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('the last observer leaving frees the subscription; the next one reads again', () => {
    const { changes, query, watch } = setUp();
    const a = watch();
    const b = watch();

    a.stop();
    expect(changes.listenerCount()).toBe(1);
    b.stop();
    expect(changes.listenerCount()).toBe(0);
    watch();

    expect(query).toHaveBeenCalledTimes(2);
  });

  it('a failed read ends every observation with the error', async () => {
    const changes = new ManualTableChanges();
    let fingerprint = 'v1';
    const query = jest.fn(() => 1);
    const observer = { next: jest.fn(), error: jest.fn() };
    sharedQuery(changes, [workouts], () => fingerprint, query)(observer);

    fingerprint = 'v2';
    query.mockImplementationOnce(() => {
      throw new Error('disk');
    });
    changes.emit('workouts');
    await flush();

    expect(observer.error).toHaveBeenCalledWith(new Error('disk'));
    expect(changes.listenerCount()).toBe(0);
  });
});
