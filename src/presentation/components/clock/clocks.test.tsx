import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useCountdown } from '@/presentation/components/clock/use-countdown';
import { useElapsed } from '@/presentation/components/clock/use-elapsed';

jest.useFakeTimers();

const START = new Date('2026-10-16T18:00:00Z');

/** The app going to the background and back, as React Native reports it. */
function appState() {
  const listeners: ((status: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.push(listener);
    return { remove: () => listeners.splice(listeners.indexOf(listener), 1) };
  });
  return (status: AppStateStatus) => act(() => listeners.forEach((listener) => listener(status)));
}

beforeEach(() => jest.setSystemTime(START));
afterEach(() => jest.restoreAllMocks());

describe('the rest countdown on screen (#229)', () => {
  it('renders once per second shown, not on every tick', async () => {
    const renders = jest.fn();
    await renderHook(() => {
      renders();
      return useCountdown(new Date(START.getTime() + 120_000));
    });
    await act(() => jest.advanceTimersByTime(0));
    const before = renders.mock.calls.length;

    // Tick by tick, each in its own update, as on the phone.
    for (let tick = 0; tick < 12; tick++) await act(() => jest.advanceTimersByTime(250));

    expect(renders.mock.calls.length - before).toBe(3);
  });
});

describe('a paused elapsed time (#229)', () => {
  it('is right at the first tick, right away, when it starts again', async () => {
    const { result, rerender } = await renderHook(
      ({ startedAt }: { startedAt: Date | null }) => useElapsed(startedAt),
      { initialProps: { startedAt: null as Date | null } },
    );

    jest.setSystemTime(START.getTime() + 90_000);
    await rerender({ startedAt: START });
    await act(() => jest.advanceTimersByTime(0));

    expect(result.current).toBe('1:30');
  });
});

describe('the clocks of the UI in the background (RNF-22)', () => {
  it('the rest countdown stops ticking in the background and is right at once when back (RF-ENT-06.AC8)', async () => {
    const goTo = appState();
    const renders = jest.fn();
    await renderHook(() => {
      renders();
      return useCountdown(new Date(START.getTime() + 120_000));
    });
    await act(() => jest.advanceTimersByTime(1_000));

    await goTo('background');
    const before = renders.mock.calls.length;
    await act(() => jest.advanceTimersByTime(60_000));
    expect(renders.mock.calls.length).toBe(before);

    await goTo('active');
    await act(() => jest.advanceTimersByTime(0));
    expect(renders.mock.calls.length).toBeGreaterThan(before);
  });

  it('the time remaining is end − now when the app comes back', async () => {
    const goTo = appState();
    const { result } = await renderHook(() => useCountdown(new Date(START.getTime() + 120_000)));

    await goTo('background');
    await act(() => jest.advanceTimersByTime(60_000));
    await goTo('active');
    await act(() => jest.advanceTimersByTime(0));

    expect(result.current).toBe(60_000);
  });

  it('the elapsed time stops ticking in the background and is right at once when back', async () => {
    const goTo = appState();
    const { result } = await renderHook(() => useElapsed(START));

    await goTo('background');
    await act(() => jest.advanceTimersByTime(90_000));
    expect(result.current).toBe('0:00');

    await goTo('active');
    await act(() => jest.advanceTimersByTime(0));
    expect(result.current).toBe('1:30');
  });

  it('the first render back is already right: a rest that ended in the background reads ended (RF-ENT-06.AC8)', async () => {
    const goTo = appState();
    const seen: (number | null)[] = [];
    await renderHook(() => {
      const value = useCountdown(new Date(START.getTime() + 120_000));
      seen.push(value);
      return value;
    });

    await goTo('background');
    jest.setSystemTime(START.getTime() + 180_000);
    seen.length = 0;
    await goTo('active');

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((value) => value !== null && value <= 0)).toBe(true);
  });
});
