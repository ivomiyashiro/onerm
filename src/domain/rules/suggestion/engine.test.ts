import {
  INITIAL_ENGINE_STATE,
  step,
  suggest,
  suggestNext,
  type SuggestionContext,
} from '@/domain/rules/suggestion/engine';
import { anExposure, aPrescription } from '@/domain/testing/builders';

const context = (overrides: Partial<SuggestionContext> = {}): SuggestionContext => ({
  today: '2026-10-05',
  workoutDates: [],
  prescription: aPrescription({ repRange: { min: 8, max: 12 }, targetRir: 2 }),
  loadType: 'external',
  grid: { unit: 'kg', increment: 2.5, minLoad: 20 },
  exerciseExposures: [],
  ...overrides,
});

describe('engine · fold over the routine exercise exposures (ADR-0009)', () => {
  it('step keeps the last ERR', () => {
    const first = anExposure([[60, 10, 2]], { workoutId: 'w1' });
    const second = anExposure([[60, 11, 2]], { workoutId: 'w2' });

    expect([first, second].reduce(step, INITIAL_ENGINE_STATE).lastExposure).toBe(second);
  });

  it('suggestNext is the fold followed by suggest', () => {
    const exposures = [anExposure([[60, 10, 2]])];

    expect(suggestNext(exposures, context())).toEqual(
      suggest(exposures.reduce(step, INITIAL_ENGINE_STATE), context()),
    );
  });

  it('RN-SUG-16 · the same history and local date give the same suggestion, whatever the clock', () => {
    const ctx = context({ exerciseExposures: [anExposure([[50, 10, 2]])] });

    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const before = suggestNext([], ctx);
    jest.setSystemTime(new Date('2030-06-15T23:59:00Z'));
    const after = suggestNext([], ctx);
    jest.useRealTimers();

    expect(after).toEqual(before);
  });
});

describe('priority 1 · without ERR (RN-SUG-02)', () => {
  it('RF-SUG-02.AC3 · with no exposure at all, calibration: no load, the floor', () => {
    expect(suggestNext([], context())).toEqual({
      loadKg: null,
      reps: 8,
      reason: { code: 'CALIBRATION' },
    });
  });

  it('bodyweight with no exposure: its own calibration (RN-SUG-12)', () => {
    expect(suggestNext([], context({ loadType: 'bodyweight' }))).toEqual({
      loadKg: null,
      reps: 8,
      reason: { code: 'BODYWEIGHT_CALIBRATION' },
    });
  });

  it('RF-SUG-02.AC1 · estimates from the e1RM of another context (RN-SUG-08)', () => {
    const finishedAt = new Date('2026-09-28T12:00:00Z');
    const ctx = context({
      grid: { unit: 'kg', increment: 5, minLoad: 5 },
      exerciseExposures: [anExposure([[50, 10, 2]], { exerciseId: 'machine-row', finishedAt })],
    });

    // caso K: e1RM 72 → 72 × 27 / 36 = 54 → down to 50.
    expect(suggestNext([], ctx)).toEqual({
      loadKg: 50,
      reps: 8,
      reason: {
        code: 'ESTIMATED_FROM_E1RM',
        e1rm: { value: 72, precision: 'approximate' },
        basis: { exerciseId: 'machine-row', at: finishedAt, loadKg: 50, reps: 10, side: null },
      },
    });
  });

  it('the e1RM of an EE is the highest of its sets (RN-SUG-07)', () => {
    // 60 × 8 RIR 2 → 80; 70 × 5 RIR 2 → 84.
    const ctx = context({
      exerciseExposures: [
        anExposure([
          [60, 8, 2],
          [70, 5, 2],
        ]),
      ],
    });

    const suggestion = suggestNext([], ctx);

    expect(suggestion.reason).toMatchObject({
      code: 'ESTIMATED_FROM_E1RM',
      e1rm: { value: 84 },
      basis: { loadKg: 70, reps: 5 },
    });
    // 84 × 27 / 36 = 63 → 62.5
    expect(suggestion.loadKg).toBe(62.5);
  });

  it('uses the most recent EE that has an e1RM', () => {
    const ctx = context({
      exerciseExposures: [
        anExposure([[60, 10, 2]], { workoutId: 'old', finishedAt: new Date('2026-09-01') }),
        // RTF 17: no e1RM.
        anExposure([[40, 14, 3]], { workoutId: 'new', finishedAt: new Date('2026-09-20') }),
      ],
    });

    expect(suggestNext([], ctx).reason).toMatchObject({ basis: { loadKg: 60, reps: 10 } });
  });

  it('never estimates under the minimum load (RN-PERF-08)', () => {
    // e1RM 22.5 → 16.9 → 15 → the bar: 20.
    const ctx = context({ exerciseExposures: [anExposure([[20, 5, 0]])] });

    expect(suggestNext([], ctx).loadKg).toBe(20);
  });

  it('RF-SUG-02.AC2 · history without an e1RM: the last W, on the grid, with the floor', () => {
    const ctx = context({
      exerciseExposures: [
        anExposure([[40, 15, 4]], { workoutId: 'old', finishedAt: new Date('2026-09-01') }),
        anExposure(
          [
            [31, 15, 4],
            [31, 15, 4],
          ],
          { workoutId: 'new', finishedAt: new Date('2026-09-20') },
        ),
      ],
    });

    // W = 31, closest multiple of 2.5 (half down): 30.
    expect(suggestNext([], ctx)).toEqual({
      loadKg: 30,
      reps: 8,
      reason: { code: 'FROM_EXERCISE_HISTORY', workingLoadKg: 31 },
    });
  });

  it('when the estimation does not apply (target RTF over 15), the last W', () => {
    const ctx = context({
      prescription: aPrescription({ repRange: { min: 12, max: 15 }, targetRir: 4 }),
      exerciseExposures: [anExposure([[50, 10, 2]])],
    });

    expect(suggestNext([], ctx)).toEqual({
      loadKg: 50,
      reps: 12,
      reason: { code: 'FROM_EXERCISE_HISTORY', workingLoadKg: 50 },
    });
  });

  it('does not apply once the routine exercise has its own exposures', () => {
    const ctx = context({ exerciseExposures: [anExposure([[50, 10, 2]])] });

    expect(
      suggestNext(
        [
          anExposure([
            [60, 10, 2],
            [60, 9, 2],
          ]),
        ],
        ctx,
      ).reason.code,
    ).not.toBe('ESTIMATED_FROM_E1RM');
  });
});
