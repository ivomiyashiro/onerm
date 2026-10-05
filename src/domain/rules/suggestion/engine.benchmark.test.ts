import {
  BENCHMARK_BUDGET_MS,
  BENCHMARK_EXPOSURES,
  runEngineBenchmark,
  syntheticHistory,
} from '@/domain/rules/suggestion/benchmark';
import { suggestNext } from '@/domain/rules/suggestion/engine';

describe('RNF-13 · engine benchmark', () => {
  it('the synthetic history has 500 exposures and goes through the progression', () => {
    const { exposures, context } = syntheticHistory();

    expect(exposures).toHaveLength(BENCHMARK_EXPOSURES);
    expect(suggestNext(exposures, context).loadKg).not.toBeNull();
  });

  it(`regression guard · the fastest run over ${BENCHMARK_EXPOSURES} exposures is under ${BENCHMARK_BUDGET_MS} ms`, () => {
    // RNF-13 itself is the median on a mid-range phone (dev menu, «Medir motor»). Here Jest runs
    // suites in parallel and the median swings with the load; the fastest run doesn't, and an
    // accidental quadratic walk over the history (106 ms before #25) still fails it.
    const result = runEngineBenchmark(() => performance.now());

    console.info(
      `RNF-13: fastest ${result.minMs.toFixed(1)} ms, median ${result.medianMs.toFixed(1)} ms over ${result.exposures} exposures`,
    );
    expect(result.minMs).toBeLessThan(BENCHMARK_BUDGET_MS);
  });
});
