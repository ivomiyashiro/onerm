import {
  EFFORT_MODES,
  EQUIPMENT,
  EXERCISE_ROLES,
  EXPERIENCE_LEVELS,
  LOAD_TYPES,
  LOAD_UNITS,
  MECHANICS,
  MUSCLES,
  TRAINING_GOALS,
} from '@/domain/models/vocabulary';
import { WORKOUT_EXERCISE_STATUSES, WORKOUT_STATUSES } from '@/domain/models/workout';

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

  it('RN-PERF-07 · the three levels', () => {
    expect(EXPERIENCE_LEVELS).toEqual(['novice', 'intermediate', 'advanced']);
  });

  it('11 §2 · the three goals', () => {
    expect(TRAINING_GOALS).toEqual(['health', 'hypertrophy', 'strength']);
  });

  it('RN-PERF-05 and RN-PERF-04 · unit and effort mode', () => {
    expect(LOAD_UNITS).toEqual(['kg', 'lb']);
    expect(EFFORT_MODES).toEqual(['simple', 'rir']);
  });

  it('06 §3 · workout and workout exercise statuses, with no discarded status', () => {
    expect(WORKOUT_STATUSES).toEqual(['in_progress', 'finished']);
    expect(WORKOUT_EXERCISE_STATUSES).toEqual(['pending', 'done', 'skipped']);
  });
});
