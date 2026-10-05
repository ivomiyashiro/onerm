import type { LocalDate } from '@/domain/models/local-date';
import type { Prescription } from '@/domain/models/prescription';
import type { LoadType } from '@/domain/models/vocabulary';
import { suggestAfterCalibrationSet as afterCalibrationSet } from '@/domain/rules/suggestion/calibration';
import {
  fold,
  suggestForExercise as forExercise,
  suggestNext as next,
} from '@/domain/rules/suggestion/engine';
import type { SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import type { LoadGrid } from '@/domain/rules/suggestion/load-grid';
import {
  SUGGESTION_CODES,
  type Suggestion,
  type SuggestionCode,
} from '@/domain/rules/suggestion/suggestion';
import {
  routineExposures,
  type Exposure,
  type ExposureSet,
} from '@/domain/rules/suggestion/exposures';
import {
  aBilateralSet,
  anExposure,
  aPrescription,
  aUnilateralSet,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';

/** RNF-15: the reason codes the cases below reach. */
const seenCodes = new Set<SuggestionCode>();
const track = (suggestion: Suggestion) => {
  seenCodes.add(suggestion.reason.code);
  return suggestion;
};
const suggestNext = (...args: Parameters<typeof next>) => track(next(...args));
const suggestForExercise = (...args: Parameters<typeof forExercise>) => track(forExercise(...args));
const suggestAfterCalibrationSet = (...args: Parameters<typeof afterCalibrationSet>) =>
  track(afterCalibrationSet(...args));

/**
 * The reference cases of sugerencias.md, literal (RNF-15). Unless a case says otherwise:
 * 3 × 8–12 · target RIR 2 · increment 2.5 kg · last workout less than 14 days ago.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const localDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
const defaults = aPrescription({ sets: 3, repRange: { min: 8, max: 12 }, targetRir: 2 });
const barbell: LoadGrid = { unit: 'kg', increment: 2.5, minLoad: 20 };

describe('caso E · calibration (novice)', () => {
  // Seated cable row · target RIR 3 · no EE. A cable's minimum load is one increment.
  const prescription = aPrescription({ repRange: { min: 8, max: 12 }, targetRir: 3 });
  const cable: LoadGrid = { unit: 'kg', increment: 2.5, minLoad: 2.5 };
  const afterSet = (loadKg: number, reps: number, rir: number) =>
    suggestAfterCalibrationSet({
      set: aBilateralSet({ loadKg, reps, rir }),
      exerciseId: 'seated-cable-row',
      prescription,
      grid: cable,
    });

  it('set 1 has no load: the user picks it', () => {
    expect(
      suggestNext([], {
        today: '2026-10-05',
        localDate,
        workoutDates: [],
        prescription,
        loadType: 'external',
        grid: cable,
        exerciseExposures: [],
      }),
    ).toEqual({ loadKg: null, reps: 8, reason: { code: 'CALIBRATION' } });
  });

  it('set 1 · 30 × 12, "4 o más" (RIR 4): RTF 16 → máx(32.5; down(36) = 35) → 35 × 8', () => {
    expect(afterSet(30, 12, 4)).toMatchObject({
      loadKg: 35,
      reps: 8,
      reason: { code: 'CALIBRATION_STEP' },
    });
  });

  it('set 2 · 35 × 11, "2 o 3" (RIR 2): e1RM 52.5 → 37.9 → down → 37.5 × 8', () => {
    expect(afterSet(35, 11, 2)).toMatchObject({
      loadKg: 37.5,
      reps: 8,
      reason: { code: 'ESTIMATED_FROM_E1RM', e1rm: { value: 52.5, precision: 'approximate' } },
    });
  });

  it('next workout · W 37.5 (tie in "most used" → the highest), sets with W [9] → 37.5 × 10 (ADD_REP), and the exposure resets the mark', () => {
    const finishedAt = new Date(Date.UTC(2026, 9, 1, 12));
    const exposure = {
      ...anExposure([], { startedAt: finishedAt, finishedAt, prescription }),
      sets: [
        { loadKg: 30, reps: 12, rir: 4, side: null },
        { loadKg: 35, reps: 11, rir: 2, side: null },
        { loadKg: 37.5, reps: 9, rir: 2, side: null },
      ],
    };
    const ctx = {
      today: '2026-10-04' as LocalDate,
      localDate,
      workoutDates: [exposure],
      prescription,
      loadType: 'external' as const,
      grid: cable,
      exerciseExposures: [exposure],
    };

    expect(summary(suggestNext([exposure], ctx))).toEqual([37.5, 10, 'ADD_REP']);
    const [record] = fold([exposure], ctx).records;
    // It comes after a calibration suggestion (RN-SUG-04).
    expect(record.suggestionBefore.reason.code).toBe('CALIBRATION');
    expect(record.isReset).toBe(true);
  });
});

describe('caso L · calibration always moves forward', () => {
  it('machine, increment 5 kg · 10 × 20 with "4 o más": RTF 24 → máx(15; down(12) = 10) → 15', () => {
    const machine: LoadGrid = { unit: 'kg', increment: 5, minLoad: 5 };

    expect(
      suggestAfterCalibrationSet({
        set: aBilateralSet({ loadKg: 10, reps: 20, rir: 4 }),
        exerciseId: 'leg-press',
        prescription: defaults,
        grid: machine,
      }),
    ).toMatchObject({ loadKg: 15, reps: 8, reason: { code: 'CALIBRATION_STEP' } });
  });
});

describe('caso R · calibration too heavy', () => {
  it('barbell · 40 × 0 → down(40 × 0.8 = 32) → 30 × 8, without asking for effort', () => {
    expect(
      suggestAfterCalibrationSet({
        set: aBilateralSet({ loadKg: 40, reps: 0, rir: null }),
        exerciseId: 'barbell-bench-press',
        prescription: defaults,
        grid: barbell,
      }),
    ).toEqual({ loadKg: 30, reps: 8, reason: { code: 'CALIBRATION_STEP_DOWN', side: null } });
  });
});

/** A set as `[loadKg, reps, rir]`, or with sides for a unilateral one. */
type LoggedSet = readonly [number | null, number, number | null];

interface HistoryOptions {
  prescription?: Prescription;
  grid?: LoadGrid;
  loadType?: LoadType;
}

function buildHistory(
  exposures: readonly (readonly LoggedSet[] | readonly ExposureSet[])[],
  prescription: Prescription,
) {
  return exposures.map((sets, i) => {
    const finishedAt = new Date(Date.UTC(2026, 8, 1 + 3 * i, 12));
    const base = anExposure([], {
      workoutId: `w${i}`,
      startedAt: finishedAt,
      finishedAt,
      prescription,
    });
    const asSets = sets.map((set) =>
      Array.isArray(set)
        ? { loadKg: set[0], reps: set[1], rir: set[2], side: null }
        : (set as ExposureSet),
    );
    return { ...base, sets: asSets };
  });
}

/** The context once exposures 0..i are done; today is 3 days after the last one: no reentry. */
function contextAfter(
  history: ReturnType<typeof buildHistory>,
  i: number,
  { prescription = defaults, grid = barbell, loadType = 'external' }: HistoryOptions,
): SuggestionContext {
  const done = history.slice(0, i + 1);
  return {
    today: localDate(new Date(history[i].finishedAt.getTime() + 3 * DAY_MS)),
    localDate,
    workoutDates: done,
    prescription,
    loadType,
    grid,
    exerciseExposures: done,
  };
}

/**
 * The suggestion after each exposure of a routine exercise, in order: `result[i]` is what the
 * engine suggests once exposures 0..i are done. Exposures are 3 days apart (no reentry).
 */
function suggestionsAfter(
  exposures: readonly (readonly LoggedSet[] | readonly ExposureSet[])[],
  options: HistoryOptions = {},
): Suggestion[] {
  const history = buildHistory(exposures, options.prescription ?? defaults);
  return history.map((_, i) =>
    suggestNext(history.slice(0, i + 1), contextAfter(history, i, options)),
  );
}

/** The fold records of the whole history: the stagnation count and resets (RN-SUG-04). */
function recordsOf(
  exposures: readonly (readonly LoggedSet[] | readonly ExposureSet[])[],
  options: HistoryOptions = {},
) {
  const history = buildHistory(exposures, options.prescription ?? defaults);
  return fold(history, contextAfter(history, history.length - 1, options)).records;
}

const summary = (suggestion: Suggestion) =>
  [suggestion.loadKg, suggestion.reps, suggestion.reason.code] as const;
const rir2 = (load: number, ...reps: number[]): LoggedSet[] => reps.map((r) => [load, r, 2]);
const withRir = (load: number, rir: number, ...reps: number[]): LoggedSet[] =>
  reps.map((r) => [load, r, rir]);

describe('caso A · double progression, stagnation and deload', () => {
  const after = suggestionsAfter([
    rir2(60, 10, 9, 9),
    rir2(60, 11, 10, 10),
    rir2(60, 12, 12, 12),
    rir2(62.5, 8, 8, 7),
    rir2(62.5, 8, 8, 7),
    rir2(62.5, 8, 8, 7),
    rir2(62.5, 8, 8, 7),
    rir2(57.5, 11, 10, 10),
  ]).map(summary);

  it('exp. 1 · 60 × 10, 9, 9 → 60 × 10 (ADD_REP)', () => {
    expect(after[0]).toEqual([60, 10, 'ADD_REP']);
  });

  it('exp. 2 · 60 × 11, 10, 10 → 60 × 11 (ADD_REP)', () => {
    expect(after[1]).toEqual([60, 11, 'ADD_REP']);
  });

  it('exp. 3 · 60 × 12, 12, 12 → 62.5 × 8 (máx(62.5; 63) = 63 → 62.5; INCREASE_LOAD)', () => {
    expect(after[2]).toEqual([62.5, 8, 'INCREASE_LOAD']);
  });

  it('exp. 4 to 6 · 62.5 × 8, 8, 7 → 62.5 × 8 (REPEAT), the count goes 0, 1, 2', () => {
    expect(after.slice(3, 6)).toEqual([
      [62.5, 8, 'REPEAT'],
      [62.5, 8, 'REPEAT'],
      [62.5, 8, 'REPEAT'],
    ]);
  });

  it('exp. 7 · the count is 3 → 57.5 × 8 (mín(60; 56.25) = 56.25 → 57.5; DELOAD)', () => {
    expect(after[6]).toEqual([57.5, 8, 'DELOAD']);
  });

  it('exp. 8 · 57.5 × 11, 10, 10 resets → 57.5 × 11 (ADD_REP)', () => {
    expect(after[7]).toEqual([57.5, 11, 'ADD_REP']);
  });

  it('the count column: 0, 0, 0, 0, 1, 2, 3, then the reset after DELOAD', () => {
    const records = recordsOf([
      rir2(60, 10, 9, 9),
      rir2(60, 11, 10, 10),
      rir2(60, 12, 12, 12),
      rir2(62.5, 8, 8, 7),
      rir2(62.5, 8, 8, 7),
      rir2(62.5, 8, 8, 7),
      rir2(62.5, 8, 8, 7),
      rir2(57.5, 11, 10, 10),
    ]);

    expect(records.map((record) => record.stagnationCount)).toEqual([0, 0, 0, 0, 1, 2, 3, 0]);
    expect(records[7].suggestionBefore.reason.code).toBe('DELOAD');
    expect(records[7].isReset).toBe(true);
  });
});

describe('caso B · consolidate once, then go up', () => {
  const after = suggestionsAfter([
    withRir(60, 0, 11, 11, 10),
    withRir(60, 0, 12, 12, 12),
    withRir(60, 0, 12, 12, 12),
  ]).map(summary);

  it('exp. 1 → 60 × 11 (ADD_REP: a single signal)', () => {
    expect(after[0]).toEqual([60, 11, 'ADD_REP']);
  });

  it('exp. 2 → 60 × 12 (CONSOLIDATE: 2 signals and the cap)', () => {
    expect(after[1]).toEqual([60, 12, 'CONSOLIDATE']);
  });

  it('exp. 3 → 62.5 × 8 (INCREASE_LOAD: already consolidated once)', () => {
    expect(after[2]).toEqual([62.5, 8, 'INCREASE_LOAD']);
  });

  it('exp. 3 reaches the cap without a better mark and does not add to the count (RF-SUG-04.AC2)', () => {
    const records = recordsOf([
      withRir(60, 0, 11, 11, 10),
      withRir(60, 0, 12, 12, 12),
      withRir(60, 0, 12, 12, 12),
    ]);

    expect(records.map((record) => record.stagnationCount)).toEqual([0, 0, 0]);
  });
});

describe('caso C · early and high increase', () => {
  it('60 × 10 RIR 4, then 60 × 11 RIR 4: inside the range → 62.5 × 8 (EARLY_INCREASE)', () => {
    const after = suggestionsAfter([withRir(60, 4, 10, 10, 10), withRir(60, 4, 11, 11, 11)]);

    expect(summary(after[1])).toEqual([62.5, 8, 'EARLY_INCREASE']);
  });

  it('variant: then 60 × 12 RIR 4 → 65 × 8 (máx(62.5; 66) = 66 → 65; HIGH_INCREASE)', () => {
    const after = suggestionsAfter([withRir(60, 4, 10, 10, 10), withRir(60, 4, 12, 12, 12)]);

    expect(summary(after[1])).toEqual([65, 8, 'HIGH_INCREASE']);
  });
});

describe('caso F · unilateral', () => {
  it('20 kg × (R 12 / L 10), (R 12 / L 10), (R 12 / L 11) → limiting 10, 10, 11 → 20 × 11', () => {
    const dumbbell: LoadGrid = { unit: 'kg', increment: 2, minLoad: 2 };
    const left = (reps: number): ExposureSet => ({ loadKg: 20, reps, rir: 2, side: 'left' });
    const [after] = suggestionsAfter([[left(10), left(10), left(11)]], { grid: dumbbell });

    expect(summary(after)).toEqual([20, 11, 'ADD_REP']);
    expect(after.reason).toMatchObject({ limitingSide: { side: 'left', reps: 10 } });
  });

  it('from the logged sets: each set reads its limiting side (RN-ENT-06)', () => {
    const dumbbell: LoadGrid = { unit: 'kg', increment: 2, minLoad: 2 };
    const workout = aWorkout({
      exercises: [
        aWorkoutExercise({
          routineExerciseId: 're-1',
          exerciseId: 'one-arm-row',
          isUnilateral: true,
          sets: [
            [12, 10],
            [12, 10],
            [12, 11],
          ].map(([repsRight, repsLeft], i) =>
            aUnilateralSet({ id: `s${i}`, position: i, loadKg: 20, repsRight, repsLeft }),
          ),
        }),
      ],
    });
    const exposures = routineExposures({ id: 're-1', exerciseId: 'one-arm-row' }, [workout]);

    expect(summary(suggestNext(exposures, contextOn(3, exposures, { grid: dumbbell })))).toEqual([
      20,
      11,
      'ADD_REP',
    ]);
  });
});

describe('caso G · minimum jump over 10 %: reps first', () => {
  // Dumbbell curl · 12 kg · increment 2 kg: subida(12) = 14, +16.7 %.
  const dumbbell: LoadGrid = { unit: 'kg', increment: 2, minLoad: 2 };
  const after = suggestionsAfter(
    [rir2(12, 12, 12, 12), rir2(12, 13, 13, 13), rir2(12, 14, 14, 14)],
    { grid: dumbbell },
  ).map(summary);

  it('exp. 1 · 12 × 12, 12, 12 → 12 × 13 (mín(14, 12 + 1); EXTEND_REPS)', () => {
    expect(after[0]).toEqual([12, 13, 'EXTEND_REPS']);
  });

  it('exp. 2 · 12 × 13, 13, 13 → 12 × 14 (EXTEND_REPS)', () => {
    expect(after[1]).toEqual([12, 14, 'EXTEND_REPS']);
  });

  it('exp. 3 · 12 × 14, 14, 14 → 14 × 8 (INCREASE_LOAD)', () => {
    expect(after[2]).toEqual([14, 8, 'INCREASE_LOAD']);
  });
});

describe('caso I · W is the most used load', () => {
  it('60 × 10, 60 × 9, 55 × 10 → W 60, sets with W [10, 9] → 60 × 10 (ADD_REP)', () => {
    const [after] = suggestionsAfter([
      [
        [60, 10, 2],
        [60, 9, 2],
        [55, 10, 2],
      ],
    ]);

    expect(summary(after)).toEqual([60, 10, 'ADD_REP']);
  });
});

describe('caso J · novice with the simple scale (target RIR 3)', () => {
  const novice = aPrescription({ sets: 3, repRange: { min: 8, max: 12 }, targetRir: 3 });

  it('J1 · "1" twice with the cap → 40 × 12 (CONSOLIDATE); then "Ninguna" → 42.5 × 8', () => {
    const after = suggestionsAfter(
      [withRir(40, 1, 11, 11, 11), withRir(40, 1, 12, 12, 12), withRir(40, 0, 12, 12, 12)],
      { prescription: novice },
    ).map(summary);

    expect(after[1]).toEqual([40, 12, 'CONSOLIDATE']);
    expect(after[2]).toEqual([42.5, 8, 'INCREASE_LOAD']);
  });

  it('J2 · "4 o más" twice inside the range → 42.5 × 8 (EARLY_INCREASE)', () => {
    const after = suggestionsAfter([withRir(40, 4, 10, 10, 10), withRir(40, 4, 11, 11, 11)], {
      prescription: novice,
    });

    expect(summary(after[1])).toEqual([42.5, 8, 'EARLY_INCREASE']);
  });
});

describe('caso M · bodyweight', () => {
  // Push-ups · 3 × 8–15.
  const pushUps = aPrescription({ sets: 3, repRange: { min: 8, max: 15 }, targetRir: 2 });
  const reps = (...values: number[]): LoggedSet[] => values.map((r) => [null, r, null]);
  const after = (sets: LoggedSet[]) =>
    summary(suggestionsAfter([sets], { prescription: pushUps, loadType: 'bodyweight' })[0]);

  it('15, 14, 13 → 14 (BODYWEIGHT_ADD_REP)', () => {
    expect(after(reps(15, 14, 13))).toEqual([null, 14, 'BODYWEIGHT_ADD_REP']);
  });

  it('15, 15, 15 → 15 (BODYWEIGHT_READY)', () => {
    expect(after(reps(15, 15, 15))).toEqual([null, 15, 'BODYWEIGHT_READY']);
  });

  it('5, 5, 4 → 8 (máx(floor, mín(15, 4 + 1)))', () => {
    expect(after(reps(5, 5, 4))).toEqual([null, 8, 'BODYWEIGHT_ADD_REP']);
  });

  it('15, 15 (only 2 sets) → 15, but BODYWEIGHT_ADD_REP: sets missing to be "ready"', () => {
    expect(after(reps(15, 15))).toEqual([null, 15, 'BODYWEIGHT_ADD_REP']);
  });
});

describe('caso Q · fewer sets than prescribed', () => {
  it('60 × 12, 12 (2 sets) → 60 × 12 (COMPLETE_SETS); then 60 × 12, 12, 12 → 62.5 × 8', () => {
    const after = suggestionsAfter([rir2(60, 12, 12), rir2(60, 12, 12, 12)]).map(summary);

    expect(after[0]).toEqual([60, 12, 'COMPLETE_SETS']);
    expect(after[1]).toEqual([62.5, 8, 'INCREASE_LOAD']);
  });

  it('a COMPLETE_SETS exposure does not add to the stagnation count (RN-SUG-04, RF-SUG-03.AC8)', () => {
    // Repeating 2 of 3 sets at the cap, without a better mark, never ends in a DELOAD.
    const exposures = [
      rir2(60, 11, 11, 11),
      rir2(60, 12, 12),
      rir2(60, 12, 12),
      rir2(60, 12, 12),
      rir2(60, 12, 12),
    ];

    expect(recordsOf(exposures).map((record) => record.stagnationCount)).toEqual([0, 0, 0, 0, 0]);
    expect(summary(suggestionsAfter(exposures)[4])).toEqual([60, 12, 'COMPLETE_SETS']);
  });
});

/** One ERR finished on `finishedAt`, with the default prescription unless given. */
const errOn = (finishedAt: Date, sets: LoggedSet[], prescription = defaults) => ({
  ...anExposure([], {
    workoutId: finishedAt.toISOString(),
    startedAt: finishedAt,
    finishedAt,
    prescription,
  }),
  sets: sets.map(([loadKg, reps, rir]) => ({ loadKg, reps, rir, side: null })),
});
const onDay = (n: number) => new Date(Date.UTC(2026, 0, 10 + n, 18));

function contextOn(
  todayN: number,
  history: readonly Exposure[],
  overrides: Partial<SuggestionContext> = {},
): SuggestionContext {
  return {
    today: localDate(onDay(todayN)),
    localDate,
    workoutDates: history,
    prescription: defaults,
    loadType: 'external',
    grid: barbell,
    exerciseExposures: history,
    ...overrides,
  };
}

describe('caso D · reentry (general inactivity)', () => {
  // W = 62.5 kg.
  const history = [errOn(onDay(0), rir2(62.5, 10, 10, 10))];
  const on = (todayN: number) => summary(suggestNext(history, contextOn(todayN, history)));

  it('last workout 25 days ago → 57.5 × 8 (mín(60; 56.25) → 57.5; REENTRY)', () => {
    expect(on(25)).toEqual([57.5, 8, 'REENTRY']);
  });

  it('45 days ago → 50 × 8 (mín(60; 50) = 50)', () => {
    expect(on(45)).toEqual([50, 8, 'REENTRY']);
  });

  it('15 days ago → the normal rules (15 ≤ 21)', () => {
    expect(on(15)).toEqual([62.5, 11, 'ADD_REP']);
  });
});

describe('caso H · prescription change', () => {
  it('100 × 6, 6, 6 RIR 2 in 4–6 → 8–12 RIR 3: e1RM 124.1 → 89.7 → down → 87.5 × 8', () => {
    const strength = aPrescription({ sets: 3, repRange: { min: 4, max: 6 }, targetRir: 2 });
    const health = aPrescription({ sets: 3, repRange: { min: 8, max: 12 }, targetRir: 3 });
    const history = [errOn(onDay(0), rir2(100, 6, 6, 6), strength)];

    const suggestion = suggestNext(history, contextOn(3, history, { prescription: health }));

    expect(summary(suggestion)).toEqual([87.5, 8, 'PRESCRIPTION_CHANGED']);
    expect(suggestion.reason).toMatchObject({ e1rm: { precision: 'standard' } });
    expect((suggestion.reason as { e1rm: { value: number } }).e1rm.value).toBeCloseTo(124.14, 2);
  });
});

describe('caso K · substitute with history', () => {
  it('machine row instead of the pulldown: last EE 50 × 10 RIR 2 → e1RM 72 → 54 → 50 × 8', () => {
    const machine: LoadGrid = { unit: 'kg', increment: 5, minLoad: 5 };
    const rowHistory = [errOn(onDay(0), [[50, 10, 2]])];

    const suggestion = suggestForExercise(
      contextOn(3, rowHistory, { grid: machine, prescription: defaults }),
    );

    expect(summary(suggestion)).toEqual([50, 8, 'ESTIMATED_FROM_E1RM']);
    expect(suggestion.reason).toMatchObject({ e1rm: { value: 72, precision: 'approximate' } });
  });
});

describe('caso N · minimum load with a barbell', () => {
  it('W 22.5 kg, 45 days of pause → bajada(22.5; 20 %) = 17.5 → under 20 kg → 20 × 8', () => {
    const history = [errOn(onDay(0), rir2(22.5, 10, 10, 10))];

    expect(summary(suggestNext(history, contextOn(45, history)))).toEqual([20, 8, 'REENTRY']);
  });
});

describe('caso O · reentry per exercise in a rotation (PLT-TP4)', () => {
  const machine: LoadGrid = { unit: 'kg', increment: 5, minLoad: 5 };
  // The user trains up to day 0 and not again until day 30. Leg press last done on day −2.
  const legPressBefore = errOn(onDay(-2), rir2(100, 10, 10, 10));
  const otherWorkouts = [onDay(0), onDay(30)].map((finishedAt) => ({
    startedAt: finishedAt,
    finishedAt,
  }));

  it('day 30, torso A: its last ERR is from before day 0, a 30-day gap → −10 % (REENTRY)', () => {
    const torso = [errOn(onDay(-3), rir2(60, 10, 10, 10))];
    const ctx = contextOn(30, torso, { workoutDates: [...torso, ...otherWorkouts.slice(0, 1)] });

    expect(summary(suggestNext(torso, ctx))).toEqual([55, 8, 'REENTRY']);
  });

  it('day 32, leg A: the last workout was 2 days ago, but since the last ERR there was a 30-day gap → 90 × 8', () => {
    const history = [legPressBefore];
    const ctx = contextOn(32, history, {
      grid: machine,
      workoutDates: [...history, ...otherWorkouts],
    });

    expect(summary(suggestNext(history, ctx))).toEqual([90, 8, 'REENTRY']);
  });

  it('day 39, leg A again: the last ERR is from day 32, no gap since → the normal rules', () => {
    const history = [legPressBefore, errOn(onDay(32), rir2(90, 10, 10, 10))];
    const ctx = contextOn(39, history, {
      grid: machine,
      workoutDates: [...history, ...otherWorkouts, { startedAt: onDay(35), finishedAt: onDay(35) }],
    });

    expect(summary(suggestNext(history, ctx))).toEqual([90, 11, 'ADD_REP']);
  });
});

describe('caso P · lowering the load on your own resets the mark', () => {
  it('best mark (62.5; 8), then 57.5 × 9, 9, 9 by choice → reset; adding reps never reaches DELOAD', () => {
    const after = suggestionsAfter([
      rir2(62.5, 8, 8, 8),
      rir2(57.5, 9, 9, 9),
      rir2(57.5, 10, 10, 10),
      rir2(57.5, 11, 11, 11),
    ]).map(summary);

    expect(after.map(([, , code]) => code)).not.toContain('DELOAD');
    expect(after[3]).toEqual([57.5, 12, 'ADD_REP']);
  });
});

describe('caso S · history without an e1RM', () => {
  it('leg press, no ERR · last EE 42 × 20, 20 with "4 o más" (RTF 24) → W 42 → 40 × 8', () => {
    const machine: LoadGrid = { unit: 'kg', increment: 5, minLoad: 5 };
    const history = [
      errOn(onDay(0), [
        [42, 20, 4],
        [42, 20, 4],
      ]),
    ];

    expect(summary(suggestForExercise(contextOn(3, history, { grid: machine })))).toEqual([
      40,
      8,
      'FROM_EXERCISE_HISTORY',
    ]);
  });
});

describe('caso T · bodyweight calibration', () => {
  it('dips · 3 × 8–15 · no EE → no load and the calibration instruction', () => {
    const dips = aPrescription({ sets: 3, repRange: { min: 8, max: 15 }, targetRir: 2 });

    expect(
      summary(suggestForExercise(contextOn(0, [], { prescription: dips, loadType: 'bodyweight' }))),
    ).toEqual([null, 8, 'BODYWEIGHT_CALIBRATION']);
  });
});

describe('RNF-15 · every reason code appears in at least one case', () => {
  it('the cases above reach every code of RN-SUG-11', () => {
    expect(SUGGESTION_CODES.filter((code) => !seenCodes.has(code))).toEqual([]);
  });
});
