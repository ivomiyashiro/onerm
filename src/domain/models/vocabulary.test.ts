import {
  EQUIPMENT,
  EXERCISE_ROLES,
  LOAD_TYPES,
  MECHANICS,
  MUSCLES,
} from '@/domain/models/vocabulary';

describe('controlled vocabularies', () => {
  it('RN-CAT-03 · the twelve muscles', () => {
    expect(MUSCLES).toEqual([
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'forearms',
      'abs',
      'quads',
      'hamstrings',
      'glutes',
      'calves',
      'adductors',
    ]);
  });

  it('RN-CAT-03 · the six kinds of equipment', () => {
    expect(EQUIPMENT).toEqual([
      'barbell',
      'dumbbell',
      'machine',
      'cable',
      'bodyweight',
      'kettlebell',
    ]);
  });

  it('ADR-0005 · the MVP load types are external and bodyweight', () => {
    expect(LOAD_TYPES).toEqual(['external', 'bodyweight']);
  });

  it('ADR-0004 · mechanic and role', () => {
    expect(MECHANICS).toEqual(['compound', 'isolation']);
    expect(EXERCISE_ROLES).toEqual(['main', 'accessory']);
  });
});
