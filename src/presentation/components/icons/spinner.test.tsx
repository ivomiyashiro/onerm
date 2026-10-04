import { render } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';

import { Spinner } from '@/presentation/components/icons/spinner';
import { colors } from '@/presentation/theme';

function spyOnLoop() {
  const animation = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
  jest.spyOn(Animated, 'loop').mockReturnValue(animation);
  return animation;
}

describe('Spinner', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps turning', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const loop = spyOnLoop();

    await render(<Spinner color={colors.textPrimary} />);

    expect(loop.start).toHaveBeenCalled();
    expect(loop.stop).not.toHaveBeenCalled();
  });

  it('stays still when the system asks for less motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const loop = spyOnLoop();

    await render(<Spinner color={colors.textPrimary} />);

    // Nothing is left running: any rotation started before the setting arrived was stopped.
    expect(loop.stop).toHaveBeenCalledTimes(loop.start.mock.calls.length);
  });
});
