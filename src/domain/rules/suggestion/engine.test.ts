import type { LocalDate } from '@/domain/models/local-date';
import { fold, suggest, suggestNext } from '@/domain/rules/suggestion/engine';
import type { SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import { routineExposures } from '@/domain/rules/suggestion/exposures';
import {
  aBilateralSet,
  anExposure,
  aPrescription,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';

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

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 12));
const err = (n: number, sets: [number, number, number | null][], sets_ = 3) =>
  anExposure(sets, {
    workoutId: `w${n}`,
    startedAt: day(n),
    finishedAt: day(n),
    prescription: aPrescription({ sets: sets_, repRange: { min: 8, max: 12 }, targetRir: 2 }),
  });

describe('engine · fold over the routine exercise exposures (ADR-0009)', () => {
  it('keeps a record per ERR with its analysis', () => {
    const state = fold([err(1, [[60, 10, 2]]), err(2, [[60, 11, 2]])], context());

    expect(state.records.map((record) => record.analysis.repsWithW)).toEqual([[10], [11]]);
  });

  it('RN-SUG-17 · recalculates the suggestion made before each ERR, with the history up to then', () => {
    const first = err(1, [
      [60, 10, 2],
      [60, 9, 2],
      [60, 9, 2],
    ]);
    const second = err(3, [
      [60, 10, 2],
      [60, 10, 2],
      [60, 10, 2],
    ]);
    // An EE with an e1RM finished after the first ERR: it must not count before it.
    const later = anExposure([[50, 10, 2]], { workoutId: 'other', finishedAt: day(2) });
    const ctx = context({ exerciseExposures: [first, later, second] });

    const [before1, before2] = fold([first, second], ctx).records.map(
      (record) => record.suggestionBefore,
    );

    expect(before1.reason.code).toBe('CALIBRATION');
    expect(before2).toMatchObject({ loadKg: 60, reps: 10, reason: { code: 'ADD_REP' } });
  });

  it('suggestNext is suggest over the fold', () => {
    const exposures = [err(1, [[60, 10, 2]])];

    expect(suggestNext(exposures, context())).toEqual(
      suggest(fold(exposures, context()), context()),
    );
  });

  describe('RN-SUG-04 · resets', () => {
    const resets = (...exposures: ReturnType<typeof err>[]) =>
      fold(exposures, context()).records.map((record) => record.isReset);

    it('the first ERR comes after a priority 1 suggestion: it resets', () => {
      expect(resets(err(1, [[60, 10, 2]]))).toEqual([true]);
    });

    it('an ERR after a normal progression does not reset', () => {
      expect(resets(err(1, [[60, 10, 2]]), err(2, [[60, 11, 2]]))).toEqual([true, false]);
    });

    it('a W lower than the previous one, chosen by the user, resets (caso P)', () => {
      expect(resets(err(1, [[62.5, 8, 2]]), err(2, [[57.5, 9, 2]]))).toEqual([true, true]);
      // A higher W does not.
      expect(resets(err(1, [[60, 12, 2]]), err(2, [[62.5, 8, 2]]))).toEqual([true, false]);
    });

    it('a W that differs by less than 0.05 kg is the same W (RN-GEN-02)', () => {
      expect(resets(err(1, [[60, 10, 2]]), err(2, [[59.97, 11, 2]]))).toEqual([true, false]);
    });

    it('an N different from the previous one resets', () => {
      expect(resets(err(1, [[60, 10, 2]], 3), err(2, [[60, 10, 2]], 4))).toEqual([true, true]);
    });
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

describe('RF-SUG-04 · effort needs a sustained signal', () => {
  const codeAfter = (...exposures: ReturnType<typeof err>[]) =>
    suggestNext(exposures, context()).reason.code;

  it('AC6 · a single signal is not enough: normal double progression', () => {
    expect(
      codeAfter(
        err(1, [
          [60, 11, 2],
          [60, 11, 2],
          [60, 11, 2],
        ]),
        err(2, [
          [60, 12, 0],
          [60, 12, 0],
          [60, 12, 0],
        ]),
      ),
    ).toBe('INCREASE_LOAD');
  });

  it('AC7 · an ERR without reported effort does not qualify', () => {
    expect(
      codeAfter(
        err(1, [
          [60, 11, null],
          [60, 11, null],
          [60, 11, null],
        ]),
        err(2, [
          [60, 12, 0],
          [60, 12, 0],
          [60, 12, 0],
        ]),
      ),
    ).toBe('INCREASE_LOAD');
  });

  it('the signal needs the same W', () => {
    expect(
      codeAfter(
        err(1, [
          [57.5, 12, 0],
          [57.5, 12, 0],
          [57.5, 12, 0],
        ]),
        err(2, [
          [60, 12, 0],
          [60, 12, 0],
          [60, 12, 0],
        ]),
      ),
    ).toBe('INCREASE_LOAD');
  });

  it('the signal does not cross a reset (a different N)', () => {
    expect(
      codeAfter(
        err(
          1,
          [
            [60, 11, 0],
            [60, 11, 0],
            [60, 11, 0],
          ],
          3,
        ),
        err(
          2,
          [
            [60, 12, 0],
            [60, 12, 0],
            [60, 12, 0],
            [60, 12, 0],
          ],
          4,
        ),
      ),
    ).toBe('INCREASE_LOAD');
  });
});

describe('RF-SUG-08 · the engine uses what was done, not what was suggested', () => {
  it('AC2 · after 62.5 × 8 was suggested, 60 × 10 was logged: the next one builds on 60 × 10', () => {
    const suggestion = suggestNext(
      [
        err(1, [
          [60, 12, 2],
          [60, 12, 2],
          [60, 12, 2],
        ]),
        err(2, [
          [60, 10, 2],
          [60, 10, 2],
          [60, 10, 2],
        ]),
      ],
      context(),
    );

    expect(suggestion).toMatchObject({ loadKg: 60, reps: 11, reason: { code: 'ADD_REP' } });
  });
});

describe('RF-SUG-03 · from logged workouts', () => {
  it('AC7 · warm-up sets are ignored (RN-ENT-12)', () => {
    const routineExercise = { id: 're-1', exerciseId: 'barbell-bench-press' };
    const workout = aWorkout({
      exercises: [
        aWorkoutExercise({
          routineExerciseId: 're-1',
          exerciseId: 'barbell-bench-press',
          sets: [
            aBilateralSet({ id: 'w1', position: 0, loadKg: 20, reps: 10, isWarmup: true }),
            aBilateralSet({ id: 'w2', position: 1, loadKg: 40, reps: 5, isWarmup: true }),
            aBilateralSet({ id: 's1', position: 2, loadKg: 60, reps: 12 }),
            aBilateralSet({ id: 's2', position: 3, loadKg: 60, reps: 12 }),
            aBilateralSet({ id: 's3', position: 4, loadKg: 60, reps: 12 }),
          ],
        }),
      ],
    });
    const exposures = routineExposures(routineExercise, [workout]);

    expect(suggestNext(exposures, context())).toMatchObject({
      loadKg: 62.5,
      reps: 8,
      reason: { code: 'INCREASE_LOAD' },
    });
  });
});

describe('RN-SUG-12 · bodyweight', () => {
  it('without ERR but with EE (a substitute), progresses from the last EE with the current range', () => {
    const ctx = context({
      loadType: 'bodyweight',
      prescription: aPrescription({ sets: 3, repRange: { min: 8, max: 15 } }),
      exerciseExposures: [
        anExposure([
          [null, 10, null],
          [null, 9, null],
          [null, 9, null],
        ]),
      ],
    });

    expect(suggestNext([], ctx)).toEqual({
      loadKg: null,
      reps: 10,
      reason: { code: 'BODYWEIGHT_ADD_REP', previousReps: 9, limitingSide: null },
    });
  });
});

describe('RF-SUG-06 · reentry', () => {
  const at = (n: number) => context({ today: day(n).toISOString().slice(0, 10) as LocalDate });

  it('AC4 · has priority over the deload and the increase', () => {
    const atCap = err(1, [
      [60, 12, 2],
      [60, 12, 2],
      [60, 12, 2],
    ]);

    expect(suggestNext([atCap], at(30)).reason.code).toBe('REENTRY');
  });

  it('AC6 · without ERR, the estimate from an e1RM before the pause goes down 20 % too', () => {
    // e1RM 80 → 60; 45 days later, bajada(60; 20 %) = round(mín(57.5; 48)) = 47.5.
    const ctx = { ...at(46), exerciseExposures: [err(1, [[60, 8, 2]])] };

    expect(suggestNext([], ctx)).toMatchObject({
      loadKg: 47.5,
      reps: 8,
      reason: { code: 'ESTIMATED_FROM_E1RM', withReentry: { gapDays: 45, decreasePercent: 0.2 } },
    });
  });

  it('the last W of the exercise history goes down too', () => {
    // RTF 19: no e1RM. W 40; 30 days later, −10 %.
    const ctx = { ...at(31), exerciseExposures: [err(1, [[40, 15, 4]])] };

    expect(suggestNext([], ctx)).toMatchObject({
      loadKg: 35,
      reason: { code: 'FROM_EXERCISE_HISTORY', withReentry: { gapDays: 30 } },
    });
  });

  it('a calibration has nothing to lower', () => {
    expect(suggestNext([], at(60)).reason).toEqual({ code: 'CALIBRATION' });
  });
});

describe('RF-SUG-10 · prescription change', () => {
  it('AC2 · only the sets changed: the normal rules (but the mark resets)', () => {
    const history = [
      err(1, [
        [60, 10, 2],
        [60, 10, 2],
        [60, 10, 2],
      ]),
    ];
    const ctx = context({
      prescription: aPrescription({ sets: 4, repRange: { min: 8, max: 12 }, targetRir: 2 }),
    });

    expect(suggestNext(history, ctx).reason.code).toBe('ADD_REP');
  });

  it('AC3 · without an e1RM: W with the floor of the new range', () => {
    // RTF 19: no e1RM.
    const history = [
      err(1, [
        [40, 15, 4],
        [40, 15, 4],
        [40, 15, 4],
      ]),
    ];
    const ctx = context({
      prescription: aPrescription({ repRange: { min: 6, max: 10 }, targetRir: 2 }),
      exerciseExposures: history,
    });

    expect(suggestNext(history, ctx)).toEqual({
      loadKg: 40,
      reps: 6,
      reason: { code: 'PRESCRIPTION_CHANGED', e1rm: null, workingLoadKg: 40 },
    });
  });

  it('the ERR after a PRESCRIPTION_CHANGED suggestion resets', () => {
    const strength = aPrescription({ sets: 3, repRange: { min: 4, max: 6 }, targetRir: 2 });
    const first = {
      ...err(1, [
        [100, 6, 2],
        [100, 6, 2],
        [100, 6, 2],
      ]),
      prescription: strength,
    };
    const second = err(4, [
      [87.5, 8, 3],
      [87.5, 8, 3],
      [87.5, 8, 3],
    ]);

    const [, record] = fold(
      [first, second],
      context({ exerciseExposures: [first, second] }),
    ).records;

    expect(record.suggestionBefore.reason.code).toBe('PRESCRIPTION_CHANGED');
    expect(record.isReset).toBe(true);
  });
});
