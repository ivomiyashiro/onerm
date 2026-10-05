import { act, render, screen, userEvent } from '@testing-library/react-native';

import { EngineBenchmarkScreen } from '@/presentation/features/dev/engine-benchmark-screen';
import { dev } from '@/presentation/strings/dev';

jest.useFakeTimers();

const result = (medianMs: number) => ({ exposures: 500, runs: 9, medianMs, minMs: 10, maxMs: 14 });

describe('EngineBenchmarkScreen', () => {
  it('runs the benchmark and shows the median and whether it meets RNF-13', async () => {
    const user = userEvent.setup();
    const run = jest.fn(() => result(12.34));
    await render(<EngineBenchmarkScreen run={run} />);

    await user.press(screen.getByRole('button', { name: dev.benchmark.run }));
    await act(() => jest.runAllTimers());

    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.getByText(dev.benchmark.median('12.3'))).toBeOnTheScreen();
    expect(screen.getByText(dev.benchmark.range('10.0', '14.0', 9))).toBeOnTheScreen();
    expect(screen.getByText(dev.benchmark.pass)).toBeOnTheScreen();
  });

  it('says when it does not meet the budget', async () => {
    const user = userEvent.setup();
    await render(<EngineBenchmarkScreen run={() => result(61)} />);

    await user.press(screen.getByRole('button', { name: dev.benchmark.run }));
    await act(() => jest.runAllTimers());

    expect(screen.getByText(dev.benchmark.fail)).toBeOnTheScreen();
  });
});
