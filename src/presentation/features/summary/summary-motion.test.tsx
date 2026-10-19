import { act, render, screen } from '@testing-library/react-native';

import { CountUp } from '@/presentation/features/summary/summary-motion';

jest.useFakeTimers();

const count = (value: number) => (
  <CountUp value={value} format={(n) => String(Math.round(n))} animate delayMs={0} style={{}} />
);

describe('CountUp (#223)', () => {
  it('counts once: a value that changes afterwards shows at once, without counting again', async () => {
    const { rerender } = await render(count(800));
    await act(() => jest.advanceTimersByTime(1500));

    await rerender(count(900));

    expect(screen.getByText('900')).toBeOnTheScreen();
  });
});
