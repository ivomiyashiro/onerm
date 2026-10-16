import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useCountdown } from '@/presentation/features/workout/use-countdown';
import { useElapsed } from '@/presentation/features/workout/use-elapsed';

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
});
