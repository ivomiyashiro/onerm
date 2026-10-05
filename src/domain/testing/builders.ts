import type { Exercise } from '@/domain/models/exercise';
import type { Prescription } from '@/domain/models/prescription';
import type { Routine, RoutineDay, RoutineExercise } from '@/domain/models/routine';
import type {
  BilateralSet,
  UnilateralSet,
  Workout,
  WorkoutExercise,
} from '@/domain/models/workout';

/**
 * Test builders: a valid default for each model, with only what a test cares about overridden.
 * Used by tests only.
 */

export function anExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'barbell-back-squat',
    slug: 'sentadilla-barra',
    name: 'Sentadilla con barra',
    aliases: [],
    loadType: 'external',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes'],
    primaryEquipment: 'barbell',
    equipment: ['barbell'],
    mechanic: 'compound',
    isUnilateral: false,
    description: null,
    attributions: [],
    deprecatedAt: null,
    ...overrides,
  };
}

export function aPrescription(overrides: Partial<Prescription> = {}): Prescription {
  return {
    role: 'main',
    sets: 3,
    repRange: { min: 8, max: 12 },
    restSeconds: 120,
    targetRir: 2,
    ...overrides,
  };
}

export function aRoutineExercise(overrides: Partial<RoutineExercise> = {}): RoutineExercise {
  return {
    id: 're-1',
    routineDayId: 'day-1',
    exerciseId: 'barbell-back-squat',
    position: 0,
    prescription: aPrescription(),
    notes: null,
    ...overrides,
  };
}

export function aRoutineDay(overrides: Partial<RoutineDay> = {}): RoutineDay {
  return {
    id: 'day-1',
    routineId: 'routine-1',
    name: 'Día A',
    position: 0,
    exercises: [aRoutineExercise()],
    ...overrides,
  };
}

export function aRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'routine-1',
    name: 'Mi rutina',
    sourceTemplateId: null,
    days: [aRoutineDay()],
    ...overrides,
  };
}

export function aWorkoutExercise(overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: 'we-1',
    workoutId: 'workout-1',
    routineExerciseId: 're-1',
    plannedExerciseId: 'barbell-back-squat',
    exerciseId: 'barbell-back-squat',
    position: 0,
    status: 'pending',
    prescription: aPrescription(),
    loadType: 'external',
    isUnilateral: false,
    sets: [],
    ...overrides,
  };
}

export function aBilateralSet(overrides: Partial<BilateralSet> = {}): BilateralSet {
  return {
    id: 'set-1',
    workoutExerciseId: 'we-1',
    position: 0,
    loadKg: 60,
    isWarmup: false,
    completedAt: new Date('2026-10-05T12:00:00Z'),
    isUnilateral: false,
    reps: 10,
    rir: 2,
    ...overrides,
  };
}

export function aUnilateralSet(overrides: Partial<UnilateralSet> = {}): UnilateralSet {
  return {
    id: 'set-1',
    workoutExerciseId: 'we-1',
    position: 0,
    loadKg: 20,
    isWarmup: false,
    completedAt: new Date('2026-10-05T12:00:00Z'),
    isUnilateral: true,
    repsLeft: 10,
    repsRight: 10,
    rirLeft: 2,
    rirRight: 2,
    ...overrides,
  };
}

export function aWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'workout-1',
    routineId: 'routine-1',
    routineDayId: 'day-1',
    routineNameSnapshot: 'Mi rutina',
    dayNameSnapshot: 'Día A',
    status: 'finished',
    startedAt: new Date('2026-10-05T11:00:00Z'),
    finishedAt: new Date('2026-10-05T12:00:00Z'),
    notes: null,
    exercises: [],
    ...overrides,
  };
}
