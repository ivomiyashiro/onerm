import type { LocalDate } from '@/domain/models/local-date';
import { suggestNext } from '@/domain/rules/suggestion/engine';
import type { SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import type { Exposure } from '@/domain/rules/suggestion/exposures';

/** RNF-13: 500 exposures in less than 50 ms on a mid-range device. */
export const BENCHMARK_EXPOSURES = 500;
export const BENCHMARK_BUDGET_MS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
const toLocalDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;

/**
 * A synthetic history of `count` exposures, 3 days apart, through every phase of double
 * progression (adding reps, increases, stalls and deloads). The user also trains another day
 * in between, so the context carries 2 workouts per exposure.
 */
export function syntheticHistory(count = BENCHMARK_EXPOSURES): {
  exposures: Exposure[];
  context: SuggestionContext;
} {
  const prescription = {
    role: 'main',
    sets: 3,
    repRange: { min: 8, max: 12 },
    restSeconds: 120,
    targetRir: 2,
  } as const;
  const start = Date.UTC(2020, 0, 1, 12);
  const exposures: Exposure[] = [];
  const workoutDates: { startedAt: Date; finishedAt: Date }[] = [];
  for (let i = 0; i < count; i++) {
    const finishedAt = new Date(start + i * 3 * DAY_MS);
    const otherDay = new Date(finishedAt.getTime() + DAY_MS);
    const loadKg = 40 + 2.5 * Math.floor(i / 6);
    const reps = 8 + (i % 6);
    exposures.push({
      workoutId: `w${i}`,
      exerciseId: 'barbell-back-squat',
      startedAt: finishedAt,
      finishedAt,
      prescription,
      sets: [0, 1, 2].map(() => ({ loadKg, reps, rir: i % 4, side: null })),
    });
    workoutDates.push(
      { startedAt: finishedAt, finishedAt },
      { startedAt: otherDay, finishedAt: otherDay },
    );
  }
  const last = exposures[exposures.length - 1].finishedAt;
  return {
    exposures,
    context: {
      today: toLocalDate(new Date(last.getTime() + 2 * DAY_MS)),
      localDate: toLocalDate,
      workoutDates,
      prescription,
      loadType: 'external',
      grid: { unit: 'kg', increment: 2.5, minLoad: 20 },
      exerciseExposures: exposures,
    },
  };
}

export interface BenchmarkResult {
  readonly exposures: number;
  readonly runs: number;
  readonly medianMs: number;
  readonly minMs: number;
  readonly maxMs: number;
}

/**
 * RNF-13: times `suggestNext` over the synthetic history after one warm-up run. `now` is the
 * clock in milliseconds (`performance.now`), passed in like every other input of the domain.
 */
export function runEngineBenchmark(now: () => number, runs = 9): BenchmarkResult {
  const { exposures, context } = syntheticHistory();
  suggestNext(exposures, context);
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const started = now();
    suggestNext(exposures, context);
    times.push(now() - started);
  }
  times.sort((a, b) => a - b);
  return {
    exposures: exposures.length,
    runs,
    medianMs: times[Math.floor(runs / 2)],
    minMs: times[0],
    maxMs: times[runs - 1],
  };
}
