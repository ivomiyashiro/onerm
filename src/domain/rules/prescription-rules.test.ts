import { validatePrescription } from '@/domain/rules/prescription-rules';
import { aPrescription } from '@/domain/testing/builders';

const codes = (overrides: Parameters<typeof aPrescription>[0]) =>
  validatePrescription(aPrescription(overrides)).map((violation) => violation.code);

describe('I-03 · RN-RUT-04 · prescription limits', () => {
  it('accepts a prescription inside every limit', () => {
    expect(validatePrescription(aPrescription())).toEqual([]);
  });

  it('sets: 1–10, whole', () => {
    expect(codes({ sets: 1 })).toEqual([]);
    expect(codes({ sets: 10 })).toEqual([]);
    expect(codes({ sets: 0 })).toEqual(['prescription.sets']);
    expect(codes({ sets: 11 })).toEqual(['prescription.sets']);
    expect(codes({ sets: 2.5 })).toEqual(['prescription.sets']);
  });

  it('rep floor: 1–30, whole', () => {
    expect(codes({ repRange: { min: 1, max: 30 } })).toEqual([]);
    expect(codes({ repRange: { min: 0, max: 8 } })).toEqual(['prescription.repMin']);
    expect(codes({ repRange: { min: 7.5, max: 8 } })).toEqual(['prescription.repMin']);
  });

  it('rep cap: between the floor and 30, whole (repMin ≤ repMax)', () => {
    expect(codes({ repRange: { min: 8, max: 8 } })).toEqual([]);
    expect(codes({ repRange: { min: 8, max: 7 } })).toEqual(['prescription.repMax']);
    expect(codes({ repRange: { min: 8, max: 31 } })).toEqual(['prescription.repMax']);
    expect(codes({ repRange: { min: 8, max: 10.5 } })).toEqual(['prescription.repMax']);
  });

  it('rest: 30–600 s in steps of 15 s', () => {
    expect(codes({ restSeconds: 30 })).toEqual([]);
    expect(codes({ restSeconds: 45 })).toEqual([]);
    expect(codes({ restSeconds: 600 })).toEqual([]);
    expect(codes({ restSeconds: 15 })).toEqual(['prescription.restSeconds']);
    expect(codes({ restSeconds: 615 })).toEqual(['prescription.restSeconds']);
    expect(codes({ restSeconds: 40 })).toEqual(['prescription.restSeconds']);
  });

  it('target RIR: 0–5, whole; 0 is allowed for the user', () => {
    expect(codes({ targetRir: 0 })).toEqual([]);
    expect(codes({ targetRir: 5 })).toEqual([]);
    expect(codes({ targetRir: -1 })).toEqual(['prescription.targetRir']);
    expect(codes({ targetRir: 6 })).toEqual(['prescription.targetRir']);
    expect(codes({ targetRir: 1.5 })).toEqual(['prescription.targetRir']);
  });

  it('reports every broken limit, with the path of the field', () => {
    expect(
      validatePrescription(aPrescription({ sets: 0, restSeconds: 20 }), [
        'days',
        0,
        'exercises',
        1,
      ]),
    ).toEqual([
      { code: 'prescription.sets', path: ['days', 0, 'exercises', 1, 'prescription', 'sets'] },
      {
        code: 'prescription.restSeconds',
        path: ['days', 0, 'exercises', 1, 'prescription', 'restSeconds'],
      },
    ]);
  });

  it('the rep range path follows the model', () => {
    expect(validatePrescription(aPrescription({ repRange: { min: 0, max: 40 } }))).toEqual([
      { code: 'prescription.repMin', path: ['prescription', 'repRange', 'min'] },
      { code: 'prescription.repMax', path: ['prescription', 'repRange', 'max'] },
    ]);
  });
});
