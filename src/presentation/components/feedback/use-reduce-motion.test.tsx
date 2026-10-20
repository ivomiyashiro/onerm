import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { Text } from '@/presentation/components/text';

function Probe({ name }: { name: string }) {
  return <Text>{`${name} ${useReduceMotion() ? 'reduce' : 'full'}`}</Text>;
}

function spyOnSetting(enabled: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled);
  const changed: ((enabled: boolean) => void)[] = [];
  const subscribe = jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((event, handler) => {
      if ((event as string) === 'reduceMotionChanged') {
        changed.push(handler as unknown as (enabled: boolean) => void);
      }
      return { remove: jest.fn() } as unknown as ReturnType<
        typeof AccessibilityInfo.addEventListener
      >;
    });
  // A spy left by another test comes back with its calls.
  subscribe.mockClear();
  return { subscribe, change: (value: boolean) => changed.forEach((handler) => handler(value)) };
}

afterEach(() => jest.restoreAllMocks());

describe('useReduceMotion (marca §6)', () => {
  it('follows the system setting and its changes', async () => {
    const setting = spyOnSetting(true);
    await render(<Probe name="a" />);
    await act(async () => {});

    expect(screen.getByText('a reduce')).toBeOnTheScreen();

    await act(() => setting.change(false));

    expect(screen.getByText('a full')).toBeOnTheScreen();
  });

  it('#248: many components share one subscription to the system', async () => {
    const setting = spyOnSetting(false);
    await render(
      <>
        <Probe name="a" />
        <Probe name="b" />
        <Probe name="c" />
      </>,
    );
    await act(async () => {});

    const reduceMotion = setting.subscribe.mock.calls.filter(
      ([event]) => (event as string) === 'reduceMotionChanged',
    );
    expect(reduceMotion).toHaveLength(1);
  });
});
