import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aPrescription,
  aRoutine,
  aRoutineDay,
  aRoutineExercise,
  anExercise,
  aWorkout,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import {
  useRoutineEditorViewModel,
  type RoutineEditorViewModel,
} from '@/presentation/features/routine-editor/use-routine-editor-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

const SQUAT = anExercise();
const CURL = anExercise({ id: 'curl', name: 'Curl de bíceps', mechanic: 'isolation' });
const MINE = aRoutine({
  name: 'Mi rutina',
  days: [
    aRoutineDay({
      exercises: [
        aRoutineExercise({ id: 're-1' }),
        aRoutineExercise({
          id: 're-2',
          exerciseId: 'curl',
          prescription: aPrescription({ role: 'accessory' }),
        }),
      ],
    }),
  ],
});

async function renderViewModel({
  routineId = 'routine-1' as string | null,
  routines = [MINE] as Routine[],
  profile = { ...defaultProfile(), goal: 'hypertrophy' } as Profile,
  inProgress = null as Workout | null,
} = {}) {
  let n = 0;
  const repositories = {
    routines: new InMemoryRoutineRepository(routines),
    templates: new InMemoryRoutineTemplateRepository(),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(inProgress),
    exercises: [SQUAT, CURL],
    newId: () => `new-${++n}`,
  };
  const onClose = jest.fn();
  const onGoToWorkout = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={someUseCases(routineUseCasesOver(repositories))}>
      {children}
    </UseCasesProvider>
  );
  const hook = await renderHook(
    () => useRoutineEditorViewModel(routineId, { onClose, onGoToWorkout }),
    { wrapper },
  );
  return { ...hook, ...repositories, onClose, onGoToWorkout };
}

function content(viewModel: RoutineEditorViewModel) {
  if (viewModel.state.status !== 'content') throw new Error(`state ${viewModel.state.status}`);
  return viewModel.state;
}

describe('useRoutineEditorViewModel', () => {
  it('shows the routine with the names of its exercises', async () => {
    const { result } = await renderViewModel();

    const state = content(result.current);
    expect(state.routine.name).toBe('Mi rutina');
    expect(state.nameOf('curl')).toBe('Curl de bíceps');
    expect(state.isNew).toBe(false);
  });

  it('a read error offers to retry', async () => {
    const execute = jest.fn().mockRejectedValueOnce(new Error('disk')).mockResolvedValue(null);
    const loadRoutineDraft = { execute } as unknown as UseCases['loadRoutineDraft'];
    const { result } = await renderHook(
      () =>
        useRoutineEditorViewModel('routine-1', { onClose: jest.fn(), onGoToWorkout: jest.fn() }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <UseCasesProvider useCases={someUseCases({ loadRoutineDraft })}>
            {children}
          </UseCasesProvider>
        ),
      },
    );
    expect(result.current.state.status).toBe('error');

    await act(() => result.current.actions.retry());

    expect(result.current.state.status).toBe('missing');
  });

  it('is missing when the routine no longer exists', async () => {
    const { result } = await renderViewModel({ routineId: 'gone' });
    expect(result.current.state.status).toBe('missing');
  });

  it('RF-RUT-04.AC2: tells that the changes apply from the next workout', async () => {
    const { result } = await renderViewModel({
      inProgress: aWorkout({ status: 'in_progress', finishedAt: null }),
    });
    expect(content(result.current).workoutInProgress).toBe(true);
  });

  it('RF-RUT-03.AC5: leaving with changes asks first (D08), and without changes just leaves', async () => {
    const { result, onClose } = await renderViewModel();

    await act(() => result.current.actions.back());
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(() => result.current.actions.setName('Pierna'));
    await act(() => result.current.actions.back());
    expect(result.current.dialog).toEqual({ kind: 'discard' });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(() => result.current.actions.confirmDialog());
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('RF-RUT-05.AC2: «Subir» moves the exercise, and saving keeps the new order', async () => {
    const { result, routines, onClose } = await renderViewModel();

    await act(() => result.current.actions.moveExercise('re-2', -1));
    await act(() => result.current.actions.save());

    expect(routines.routines[0].days[0].exercises.map((e) => e.id)).toEqual(['re-2', 're-1']);
    expect(onClose).toHaveBeenCalled();
  });

  it('RF-RUT-05.AC4: warns when an accessory goes before a main exercise', async () => {
    const { result } = await renderViewModel();
    expect(content(result.current).orderHint).toBe(false);

    await act(() => result.current.actions.moveExercise('re-2', -1));
    expect(content(result.current).orderHint).toBe(true);
  });

  it('RN-RUT-05 (#225): a day name longer than 20, saved before the limit, opens its sheet', async () => {
    const legacy = aRoutine({
      name: 'Mi rutina',
      days: [
        aRoutineDay({ id: 'day-1', exercises: [aRoutineExercise({ id: 're-1' })] }),
        aRoutineDay({
          id: 'day-2',
          name: 'Tren superior con énfasis en espalda',
          exercises: [aRoutineExercise({ id: 're-2' })],
        }),
      ],
    });
    const { result, routines, onClose } = await renderViewModel({ routines: [legacy] });

    await act(() => result.current.actions.save());

    expect(content(result.current).selectedDayId).toBe('day-2');
    expect(result.current.daySheetOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(routines.routines[0].days[1].name).toBe('Tren superior con énfasis en espalda');
  });

  describe('a new routine', () => {
    it('RF-RUT-03.AC4: a day without exercises is not saved and says which day', async () => {
      const { result, routines } = await renderViewModel({ routineId: null, routines: [] });

      await act(() => result.current.actions.setName('Pierna'));
      await act(() => result.current.actions.save());

      expect(content(result.current).errors).toEqual({ name: false, emptyDayId: 'new-2' });
      expect(routines.routines).toEqual([]);
    });

    it('RF-RUT-03.AC3: a blank name is not saved', async () => {
      const { result } = await renderViewModel({ routineId: null, routines: [] });

      await act(() => result.current.actions.save());

      expect(content(result.current).errors.name).toBe(true);
    });

    it('RF-RUT-03.AC1, AC2: adds an exercise with its defaults, saves, and offers to activate it (D15)', async () => {
      const { result, routines, profiles, onClose } = await renderViewModel({
        routineId: null,
        routines: [],
      });

      await act(() => result.current.actions.setName('Pierna'));
      await act(() => result.current.actions.openPicker());
      await act(() => result.current.actions.pick(CURL));
      const [exercise] = content(result.current).routine.days[0].exercises;
      expect(exercise.prescription).toMatchObject({ role: 'accessory', sets: 2 });

      await act(() => result.current.actions.save());
      expect(routines.routines).toHaveLength(1);
      expect(result.current.dialog).toEqual({ kind: 'activate', routineName: 'Pierna' });

      await act(() => result.current.actions.confirmDialog());
      expect(profiles.profile?.activeRoutineId).toBe('new-1');
      expect(onClose).toHaveBeenCalled();
    });

    it('#197: picking an exercise adds it with its defaults and opens its data (step 2)', async () => {
      const { result } = await renderViewModel({ routineId: null, routines: [] });
      await act(() => result.current.actions.openPicker());

      await act(() => result.current.actions.pick(CURL));

      const [added] = content(result.current).routine.days[0].exercises;
      expect(result.current.sheet).toMatchObject({
        mode: 'add',
        exercise: { id: added.id },
        form: { sets: '2', role: 'accessory' },
      });
      // Closing step 2 keeps the defaults: it can be skipped.
      await act(() => result.current.actions.closeExercise());
      expect(content(result.current).routine.days[0].exercises).toHaveLength(1);
    });

    it('D15 «Ahora no» leaves without activating', async () => {
      const { result, profiles, onClose } = await renderViewModel({
        routineId: null,
        routines: [],
      });
      await act(() => result.current.actions.setName('Pierna'));
      await act(() => result.current.actions.openPicker());
      await act(() => result.current.actions.pick(SQUAT));
      await act(() => result.current.actions.save());

      await act(() => result.current.actions.dismissDialog());

      expect(profiles.profile?.activeRoutineId).toBeNull();
      expect(onClose).toHaveBeenCalled();
    });

    it('RN-RUT-09: activating with a workout in progress shows D14', async () => {
      const { result } = await renderViewModel({
        routineId: null,
        routines: [],
        inProgress: aWorkout({ status: 'in_progress', finishedAt: null }),
      });
      await act(() => result.current.actions.setName('Pierna'));
      await act(() => result.current.actions.openPicker());
      await act(() => result.current.actions.pick(SQUAT));
      await act(() => result.current.actions.save());

      await act(() => result.current.actions.confirmDialog());

      expect(result.current.dialog).toEqual({ kind: 'workoutInProgress' });
    });
  });

  describe('days', () => {
    it('adds a day and selects it; the day sheet renames, moves and removes it', async () => {
      const { result } = await renderViewModel();

      await act(() => result.current.actions.addDay());
      expect(content(result.current).selectedDayId).toBe('new-1');

      await act(() => result.current.actions.renameDay('Pierna'));
      await act(() => result.current.actions.moveDay(-1));
      expect(content(result.current).routine.days.map((d) => d.name)).toEqual(['Pierna', 'Día A']);

      await act(() => result.current.actions.removeDay());
      expect(content(result.current).routine.days.map((d) => d.name)).toEqual(['Día A']);
      expect(content(result.current).selectedDayId).toBe('day-1');
    });

    it('#192: a day with exercises is removed after D19, also while creating the routine', async () => {
      const { result } = await renderViewModel({ routineId: null, routines: [] });
      await act(() => result.current.actions.openPicker());
      await act(() => result.current.actions.pick(SQUAT));
      await act(() => result.current.actions.addDay());
      await act(() => result.current.actions.selectDay(content(result.current).routine.days[0].id));

      await act(() => result.current.actions.removeDay());
      expect(result.current.dialog).toEqual({ kind: 'removeDay', dayName: 'Día A', exercises: 1 });
      expect(content(result.current).routine.days).toHaveLength(2);
      await act(() => result.current.actions.dismissDialog());
      expect(content(result.current).routine.days).toHaveLength(2);

      await act(() => result.current.actions.removeDay());
      await act(() => result.current.actions.confirmDialog());
      expect(result.current.dialog).toBeNull();
      expect(content(result.current).routine.days.map((d) => d.name)).toEqual(['Día B']);
    });
  });

  describe('the prescription sheet', () => {
    it('RF-RUT-03.AC3: a floor above the cap is an error next to the field, and nothing is applied', async () => {
      const { result } = await renderViewModel();
      await act(() => result.current.actions.openExercise('re-1'));

      await act(() => result.current.actions.editForm({ repMin: '12', repMax: '8' }));
      expect(result.current.sheet?.errors).toEqual({ sets: false, reps: false, range: true });

      await act(() => result.current.actions.applyExercise());
      expect(result.current.sheet).not.toBeNull();
      expect(content(result.current).routine.days[0].exercises[0].prescription.repRange).toEqual({
        min: 8,
        max: 12,
      });
    });

    it('RF-RUT-03.AC3: sets and reps outside RN-RUT-04 are errors', async () => {
      const { result } = await renderViewModel();
      await act(() => result.current.actions.openExercise('re-1'));

      await act(() => result.current.actions.editForm({ sets: '11', repMax: '31' }));

      expect(result.current.sheet?.errors).toEqual({ sets: true, reps: true, range: false });
    });

    it('RF-RUT-03.AC7: RIR 0 warns without blocking, and the changes and notes apply (RF-RUT-06.AC1)', async () => {
      const { result } = await renderViewModel();
      await act(() => result.current.actions.openExercise('re-1'));

      await act(() =>
        result.current.actions.editForm({
          targetRir: 0,
          notes: 'Agarre cerrado',
          role: 'accessory',
        }),
      );
      expect(result.current.sheet?.rirZeroWarning).toBe(true);
      await act(() => result.current.actions.applyExercise());

      expect(result.current.sheet).toBeNull();
      expect(content(result.current).routine.days[0].exercises[0]).toMatchObject({
        notes: 'Agarre cerrado',
        prescription: { role: 'accessory', targetRir: 0, sets: 3 },
      });
    });

    it('RF-RUT-04.AC6: «Reemplazar ejercicio» picks another exercise for the same routine exercise', async () => {
      const { result } = await renderViewModel();
      await act(() => result.current.actions.openExercise('re-1'));

      await act(() => result.current.actions.replaceExercise());
      expect(result.current.picker).toEqual({
        mode: 'replace',
        dayName: 'Día A',
        routineExerciseId: 're-1',
      });
      await act(() => result.current.actions.pick(CURL));

      const [first] = content(result.current).routine.days[0].exercises;
      expect(first).toMatchObject({ id: 're-1', exerciseId: 'curl' });
      expect(result.current.picker).toBeNull();
    });

    it('RF-RUT-04.AC1: «Quitar ejercicio» takes it out of the day, also swiping its row (#198)', async () => {
      const { result } = await renderViewModel();
      await act(() => result.current.actions.openExercise('re-1'));

      await act(() => result.current.actions.removeExercise('re-1'));

      expect(content(result.current).routine.days[0].exercises.map((e) => e.id)).toEqual(['re-2']);
      expect(result.current.sheet).toBeNull();
    });
  });
});
