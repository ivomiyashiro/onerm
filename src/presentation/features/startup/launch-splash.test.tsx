import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AccessibilityInfo, Text } from 'react-native';

import { LaunchReady, LaunchSplashProvider } from '@/presentation/features/startup/launch-splash';

jest.mock('expo-splash-screen', () => ({ hide: jest.fn() }));
jest.useFakeTimers();

const LAYOUT = { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } } };
// The splash is decorative, hidden from screen readers.
const HIDDEN = { includeHiddenElements: true };

async function renderSplash(app: React.ReactNode) {
  await render(<LaunchSplashProvider>{app}</LaunchSplashProvider>);
}

describe('LaunchSplash (marca §16)', () => {
  beforeEach(() => {
    jest.mocked(SplashScreen.hide).mockClear();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  it('hides the native splash once its identical frame is laid out', async () => {
    await renderSplash(null);
    expect(SplashScreen.hide).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId('launch-splash', HIDDEN), 'layout', LAYOUT);

    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });

  it('covers the app while it is not ready, however long it takes', async () => {
    await renderSplash(<Text>App</Text>);

    await act(() => jest.advanceTimersByTime(10_000));

    expect(screen.getByTestId('launch-splash', HIDDEN)).toBeOnTheScreen();
    expect(screen.getByTestId('launch-splash-halo', HIDDEN)).toBeOnTheScreen();
  });

  it('goes away in under 1 s once the app is ready, leaving the app', async () => {
    await renderSplash(
      <>
        <LaunchReady />
        <Text>App</Text>
      </>,
    );

    await act(() => jest.advanceTimersByTime(1000));

    expect(screen.queryByTestId('launch-splash', HIDDEN)).not.toBeOnTheScreen();
    expect(screen.getByText('App')).toBeOnTheScreen();
  });

  it('with "reduce motion" there is no halo, and it still goes away when ready', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderSplash(<LaunchReady />);
    await act(async () => {});

    expect(screen.queryByTestId('launch-splash-halo', HIDDEN)).not.toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(1000));
    expect(screen.queryByTestId('launch-splash', HIDDEN)).not.toBeOnTheScreen();
  });
});
