import type { LocalDate } from '@/domain/models/local-date';
import { suggestNext } from '@/domain/rules/suggestion/engine';
import type { SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import type { Exposure } from '@/domain/rules/suggestion/exposures';
import { anExposure, aPrescription } from '@/domain/testing/builders';

const EXPOSURES = 500;
const BUDGET_MS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * RNF-13: a synthetic history of 500 exposures, 3 days apart, going through every phase of double
 * progression (adding reps, increases, stalls and deloads). The user trains 2 more days a week
 * in other routines, so the context carries 3 workouts per exposure.
 */
function syntheticHistory(): { exposures: Exposure[]; context: SuggestionContext } {
  const prescription = aPrescription({ sets: 3, repRange: { min: 8, max: 12 }, targetRir: 2 });
  const start = Date.UTC(2020, 0, 1, 12);
  const exposures: Exposure[] = [];
  const workoutDates: { startedAt: Date; finishedAt: Date }[] = [];
  for (let i = 0; i < EXPOSURES; i++) {
    const finishedAt = new Date(start + i * 3 * DAY_MS);
    const load = 40 + 2.5 * Math.floor(i / 6);
    const reps = 8 + (i % 6);
    exposures.push({
      ...anExposure([], { workoutId: `w${i}`, startedAt: finishedAt, finishedAt, prescription }),
      sets: [0, 1, 2].map(() => ({ loadKg: load, reps, rir: i % 4, side: null })),
    });
    workoutDates.push(
      { startedAt: finishedAt, finishedAt },
      {
        startedAt: new Date(finishedAt.getTime() + DAY_MS),
        finishedAt: new Date(finishedAt.getTime() + DAY_MS),
      },
    );
  }
  const last = exposures[exposures.length - 1].finishedAt;
  const context: SuggestionContext = {
    today: new Date(last.getTime() + 2 * DAY_MS).toISOString().slice(0, 10) as LocalDate,
    localDate: (instant) => instant.toISOString().slice(0, 10) as LocalDate,
    workoutDates,
    prescription,
    loadType: 'external',
    grid: { unit: 'kg', increment: 2.5, minLoad: 20 },
    exerciseExposures: exposures,
  };
  return { exposures, context };
}

describe('RNF-13 · engine benchmark', () => {
  it(`suggests over ${EXPOSURES} exposures in less than ${BUDGET_MS} ms`, () => {
    const { exposures, context } = syntheticHistory();
    suggestNext(exposures, context); // warm-up: the JIT compiles the hot paths.

    const runs = 5;
    const times: number[] = [];
    for (let i = 0; i < runs; i++) {
      const started = performance.now();
      suggestNext(exposures, context);
      times.push(performance.now() - started);
    }
    const median = times.sort((a, b) => a - b)[Math.floor(runs / 2)];

    console.info(`RNF-13: median ${median.toFixed(1)} ms over ${EXPOSURES} exposures`);
    expect(median).toBeLessThan(BUDGET_MS);
  });
});
