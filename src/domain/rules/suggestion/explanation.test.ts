import type { LocalDate } from '@/domain/models/local-date';
import type { SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import { suggestNext } from '@/domain/rules/suggestion/engine';
import { explainSuggestion } from '@/domain/rules/suggestion/explanation';
import { anExposure, aPrescription } from '@/domain/testing/builders';

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 12));
const context = (overrides: Partial<SuggestionContext> = {}): SuggestionContext => ({
  today: '2026-10-05',
  localDate: (instant) => instant.toISOString().slice(0, 10) as LocalDate,
  workoutDates: [],
  prescription: aPrescription({ repRange: { min: 8, max: 12 }, targetRir: 2 }),
  loadType: 'external',
  grid: { unit: 'kg', increment: 2.5, minLoad: 20 },
  exerciseExposures: [],
  ...overrides,
});

describe('RF-SUG-07 · explain a suggestion', () => {
  it('AC2 · the rule applied and the data used: the last ERR and its mean effort', () => {
    const last = anExposure(
      [
        [60, 10, 1],
        [60, 9, 2],
        [55, 10, null],
      ],
      { finishedAt: day(2) },
    );
    const ctx = context({ exerciseExposures: [last] });

    const explanation = explainSuggestion([last], ctx);

    expect(explanation.suggestion).toEqual(suggestNext([last], ctx));
    expect(explanation.lastTime).toEqual({ at: day(2), sets: last.sets });
    // The reported RIRs of the sets with W (60 kg): 1 and 2.
    expect(explanation.meanRir).toBe(1.5);
    expect(explanation.prescription).toBe(ctx.prescription);
  });

  it('without ERR, the EE the estimate comes from', () => {
    const old = anExposure([[60, 8, 2]], { workoutId: 'old', finishedAt: day(1) });
    const newer = anExposure([[40, 14, 3]], { workoutId: 'new', finishedAt: day(3) });

    const explanation = explainSuggestion([], context({ exerciseExposures: [old, newer] }));

    expect(explanation.suggestion.reason.code).toBe('ESTIMATED_FROM_E1RM');
    expect(explanation.lastTime?.at).toEqual(day(1));
    expect(explanation.meanRir).toBeNull();
  });

  it('without ERR nor e1RM, the last EE', () => {
    const last = anExposure([[40, 15, 4]], { finishedAt: day(3) });

    expect(explainSuggestion([], context({ exerciseExposures: [last] })).lastTime?.at).toEqual(
      day(3),
    );
  });

  it('in calibration there is no last time', () => {
    expect(explainSuggestion([], context())).toMatchObject({
      suggestion: { reason: { code: 'CALIBRATION' } },
      lastTime: null,
      meanRir: null,
    });
  });

  it('AC3 · the same history and day give the same explanation (RN-SUG-16)', () => {
    const history = [anExposure([[60, 10, 2]], { finishedAt: day(2) })];

    expect(explainSuggestion(history, context())).toEqual(explainSuggestion(history, context()));
  });
});

describe('F3 review · the explanation matches the suggestion', () => {
  it('with the EE unordered, «La última vez» is the exposure the suggestion used', () => {
    const late = anExposure([[70, 16, 4]], { workoutId: 'late', finishedAt: day(5) });
    const early = anExposure([[50, 16, 4]], { workoutId: 'early', finishedAt: day(1) });

    const explanation = explainSuggestion([], context({ exerciseExposures: [late, early] }));

    expect(explanation.suggestion.reason).toMatchObject({ workingLoadKg: 70 });
    expect(explanation.lastTime?.at).toEqual(day(5));
  });
});
