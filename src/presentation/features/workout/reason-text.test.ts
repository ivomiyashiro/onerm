import type { SuggestionExplanation } from '@/domain/rules/suggestion/explanation';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';
import { aPrescription } from '@/domain/testing/builders';
import {
  reasonIcon,
  reasonLine,
  whyDetail,
  type ReasonInput,
} from '@/presentation/features/workout/reason-text';
import { principles } from '@/presentation/strings/principles';
import { suggestions } from '@/presentation/strings/suggestions';

const prescription = aPrescription({ sets: 3, repRange: { min: 8, max: 12 }, targetRir: 2 });
const INCREASE: Suggestion = {
  loadKg: 62.5,
  reps: 8,
  reason: {
    code: 'INCREASE_LOAD',
    increasePercent: 5,
    afterOvershoot: false,
    workingLoadKg: 60,
    limitingSide: null,
  },
};
const lastTime = {
  at: new Date('2026-10-10T18:00:00Z'),
  sets: [12, 12, 12].map((reps) => ({ loadKg: 60, reps, rir: 2, side: null })),
};

function input(
  suggestion: Suggestion,
  overrides: Partial<ReasonInput> = {},
  explanation: Partial<SuggestionExplanation> = {},
): ReasonInput {
  return {
    explanation: {
      suggestion,
      lastTime,
      prescription,
      meanRir: 2.33,
      estimatedMax: { value: 95.2, precision: 'approximate' },
      ...explanation,
    },
    level: 'novice',
    effortMode: 'simple',
    unit: 'kg',
    basisName: null,
    ...overrides,
  };
}

describe('reason line (RF-SUG-07.AC1, 13 §4)', () => {
  it('a novice reads the plain line', () => {
    expect(reasonLine(input(INCREASE))).toBe('¡Completaste 3 × 12! Subimos a 62,5 kg.');
  });

  it('intermediate and advanced read the technical one', () => {
    expect(reasonLine(input(INCREASE, { level: 'intermediate' }))).toBe(
      'Tope alcanzado: +5 % → 62,5 kg.',
    );
  });

  it('loads go in the user unit', () => {
    expect(reasonLine(input(INCREASE, { unit: 'lb' }))).toBe(
      '¡Completaste 3 × 12! Subimos a 137,8 lb.',
    );
  });

  it('RF-SUG-02.AC3: the first calibration set asks for a weight in the range', () => {
    const calibration: Suggestion = { loadKg: null, reps: 8, reason: { code: 'CALIBRATION' } };

    expect(reasonLine(input(calibration, {}, { lastTime: null }))).toBe(
      'Primera vez: elegí un peso con el que puedas hacer entre 8 y 12 con buena técnica.',
    );
  });

  it('RF-SUG-10.AC1: a change of range says it was recalculated', () => {
    const changed: Suggestion = {
      loadKg: 87.5,
      reps: 8,
      reason: {
        code: 'PRESCRIPTION_CHANGED',
        e1rm: { value: 120, precision: 'standard' },
        workingLoadKg: 100,
        limitingSide: null,
      },
    };

    expect(reasonLine(input(changed))).toBe('Cambiaste el rango: recalculamos tu peso para 8–12.');
  });

  it('a combined reentry is added to the line', () => {
    const fromHistory: Suggestion = {
      loadKg: 50,
      reps: 8,
      reason: {
        code: 'FROM_EXERCISE_HISTORY',
        workingLoadKg: 55,
        limitingSide: null,
        withReentry: { gapDays: 30, decreasePercent: 10 },
      },
    };

    expect(reasonLine(input(fromHistory))).toBe(
      'Arrancamos con el peso que usaste la última vez…y como volvés después de 30 días, arrancamos un poco más liviano.',
    );
  });

  it('the icon says what changes: up, down, or the instruction of a calibration', () => {
    expect(reasonIcon('INCREASE_LOAD')).toBe('up');
    expect(reasonIcon('CALIBRATION_STEP_DOWN')).toBe('down');
    expect(reasonIcon('CALIBRATION')).toBe('info');
  });
});

describe('S10 «¿Por qué?» (RF-SUG-07.AC2)', () => {
  it('novice: the rule, the last time, the mean effort and the increase', () => {
    expect(whyDetail(input(INCREASE))).toEqual({
      title: '¿Por qué 62,5 kg × 8?',
      body: suggestions.reasons.INCREASE_LOAD.detail(),
      facts: [
        { label: 'La última vez', value: '60 kg × 12 · 12 · 12' },
        { label: 'Esfuerzo medio', value: '2 o 3 más' },
        { label: 'Subida', value: '+4 % → 62,5 kg' },
      ],
      principle: { name: 'doble progresión', summary: principles['P-11'] },
    });
  });

  it('advanced: also the calculation, with the RIR and the estimated maximum', () => {
    const detail = whyDetail(input(INCREASE, { level: 'advanced', effortMode: 'rir' }));

    expect(detail.body).toBe(
      `Tope alcanzado: +5 % → 62,5 kg. ${suggestions.reasons.INCREASE_LOAD.detail()}`,
    );
    expect(detail.facts).toEqual([
      { label: 'La última vez', value: '60 kg × 12 · 12 · 12' },
      { label: 'RIR medio', value: '2,3 (objetivo 2)' },
      { label: 'Máximo estimado (aprox.)', value: '95,2 kg' },
      { label: 'Subida', value: '+4 % → 62,5 kg' },
    ]);
  });

  it('RF-SUG-07.AC4: a unilateral reason names the limiting side', () => {
    const unilateral: Suggestion = {
      loadKg: 20,
      reps: 11,
      reason: {
        code: 'ADD_REP',
        previousReps: 10,
        workingLoadKg: 20,
        limitingSide: { side: 'left', reps: 10 },
      },
    };

    expect(whyDetail(input(unilateral)).body).toBe(
      `${suggestions.reasons.ADD_REP.detail(10, 12)} Tomamos tu lado izquierdo, que hizo 10.`,
    );
  });

  it('a calibration asks why you choose the weight, with no data yet', () => {
    const calibration: Suggestion = { loadKg: null, reps: 8, reason: { code: 'CALIBRATION' } };
    const detail = whyDetail(input(calibration, {}, { lastTime: null, meanRir: null }));

    expect(detail).toMatchObject({ title: '¿Por qué elegís vos el peso?', facts: [] });
    expect(detail.principle.name).toBe('estimar tu máximo');
  });
});
