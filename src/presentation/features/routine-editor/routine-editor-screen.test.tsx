import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Routine } from '@/domain/models/routine';
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
import { RoutineEditorScreen } from '@/presentation/features/routine-editor/routine-editor-screen';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { routines as text } from '@/presentation/strings/routines';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const PRESS = anExercise({ id: 'leg-press', name: 'Prensa de piernas' });
const CURL = anExercise({ id: 'curl', name: 'Curl de bíceps', mechanic: 'isolation' });
const MINE = aRoutine({
  name: 'Mi rutina de pierna',
  days: [
    aRoutineDay({
      exercises: [
        aRoutineExercise({ id: 're-1', exerciseId: 'leg-press' }),
        aRoutineExercise({
          id: 're-2',
          exerciseId: 'curl',
          prescription: aPrescription({ role: 'accessory', restSeconds: 90 }),
        }),
      ],
    }),
  ],
});

async function renderScreen({
  routineId = 'routine-1' as string | null,
  routines = [MINE] as Routine[],
  inProgress = false,
  useCases = undefined as UseCases | undefined,
} = {}) {
  let n = 0;
  const repositories = {
    routines: new InMemoryRoutineRepository(routines),
    templates: new InMemoryRoutineTemplateRepository(),
    profiles: new InMemoryProfileRepository({ ...defaultProfile(), goal: 'hypertrophy' }),
    workouts: new InMemoryWorkoutRepository(
      inProgress ? aWorkout({ status: 'in_progress', finishedAt: null }) : null,
    ),
    exercises: [PRESS, CURL],
    newId: () => `new-${++n}`,
  };
  const callbacks = { onClose: jest.fn(), onGoToWorkout: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases ?? someUseCases(routineUseCasesOver(repositories))}>
        <RoutineEditorScreen routineId={routineId} {...callbacks} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { ...repositories, ...callbacks, user: userEvent.setup() };
}

/** A screen reader's action on an exercise row (RF-RUT-05.AC2, #198). */
const rowAction = (row: string, actionName: string) =>
  fireEvent(screen.getByRole('button', { name: row }), 'accessibilityAction', {
    nativeEvent: { actionName },
  });

describe('RoutineEditorScreen', () => {
  it('loading: shows only the top bar', async () => {
    await renderScreen({ useCases: someUseCases() });

    expect(screen.getByRole('header', { name: text.editor.title })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: text.editor.save })).not.toBeOnTheScreen();
  });

  it('error: offers to retry', async () => {
    const loadRoutineDraft = {
      execute: jest.fn().mockRejectedValue(new Error('disk')),
    } as unknown as UseCases['loadRoutineDraft'];
    await renderScreen({ useCases: someUseCases({ loadRoutineDraft }) });

    expect(await screen.findByText(text.list.readError.title)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: text.list.readError.retry })).toBeOnTheScreen();
  });

  it('content: the name, the days and each exercise with its prescription', async () => {
    await renderScreen();

    expect(await screen.findByDisplayValue('Mi rutina de pierna')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Día A', checked: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Prensa de piernas' })).toBeOnTheScreen();
    expect(screen.getByText('3 × 8–12 · reserva 2 · 2 min')).toBeOnTheScreen();
    expect(screen.getByText('3 × 8–12 · reserva 2 · 90 s')).toBeOnTheScreen();
    // RF-RUT-05.AC2: «Subir» and «Bajar» are actions of the row; the first can't go up, the last
    // can't go down. #198: no arrows on screen, the handle is the one control by touch.
    const names = (row: string) =>
      screen
        .getByRole('button', { name: row })
        .props.accessibilityActions.map((a: { label: string }) => a.label);
    expect(names('Prensa de piernas')).toEqual([
      text.editor.moveDown,
      common.swipe.edit,
      common.swipe.remove,
    ]);
    expect(names('Curl de bíceps')).toEqual([
      text.editor.moveUp,
      common.swipe.edit,
      common.swipe.remove,
    ]);
    expect(screen.queryByRole('button', { name: text.editor.moveUp })).not.toBeOnTheScreen();
  });

  it('RF-RUT-04.AC2: with a workout in progress, tells that the changes apply from the next one', async () => {
    await renderScreen({ inProgress: true });

    expect(await screen.findByText(text.editor.workoutInProgress)).toBeOnTheScreen();
  });

  it('RF-RUT-05.AC4: moving the accessory first shows the order help', async () => {
    await renderScreen();
    await screen.findByDisplayValue('Mi rutina de pierna');

    await act(() => rowAction('Curl de bíceps', 'moveUp'));

    expect(screen.getByText(text.editor.mainFirstHelp)).toBeOnTheScreen();
  });

  it('RF-RUT-03.AC3, AC7: the prescription sheet shows the range error and the RIR 0 warning', async () => {
    const { user } = await renderScreen();
    await user.press(await screen.findByRole('button', { name: 'Prensa de piernas' }));

    await user.clear(screen.getByLabelText(text.editor.fields.repMin));
    await user.type(screen.getByLabelText(text.editor.fields.repMin), '15');
    await user.press(screen.getByRole('radio', { name: '0' }));

    expect(screen.getByText(text.editor.validation.minOverMax)).toBeOnTheScreen();
    expect(screen.getByText(text.editor.rirZeroWarning)).toBeOnTheScreen();
  });

  it('#197: role, notes, replace and remove fold under «Más opciones»', async () => {
    const { user } = await renderScreen();
    await user.press(await screen.findByRole('button', { name: 'Prensa de piernas' }));
    expect(screen.queryByLabelText(text.editor.notes)).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: text.editor.moreOptions }));
    expect(screen.getByLabelText(text.editor.notes)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: text.editor.remove })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: common.close }));
    await user.press(screen.getByRole('button', { name: 'Curl de bíceps' }));

    // Folded again for the next exercise.
    expect(screen.queryByLabelText(text.editor.notes)).not.toBeOnTheScreen();
  });

  it('RF-RUT-03.AC5: leaving with changes shows D08', async () => {
    const { user, onClose } = await renderScreen();
    await screen.findByDisplayValue('Mi rutina de pierna');
    await act(() => rowAction('Prensa de piernas', 'moveDown'));

    await user.press(screen.getByRole('button', { name: common.back }));
    expect(screen.getByText(dialogs.D08.title)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: dialogs.D08.leave }));
    expect(onClose).toHaveBeenCalled();
  });

  it('RF-RUT-03: a new routine shows «Crear rutina» and the empty day; saving it empty says which day', async () => {
    const { user } = await renderScreen({ routineId: null, routines: [] });

    expect(await screen.findByRole('header', { name: text.editor.createTitle })).toBeOnTheScreen();
    expect(screen.getByText(text.editor.emptyDay.title)).toBeOnTheScreen();

    await user.type(screen.getByLabelText(text.editor.name), 'Pierna');
    await user.press(screen.getByRole('button', { name: text.editor.save }));

    expect(screen.getByText(text.editor.dayWithoutExercises.title('Día A'))).toBeOnTheScreen();
  });

  it('RF-RUT-03.AC1: adds an exercise from the catalog, saves and offers D15', async () => {
    const { user } = await renderScreen({ routineId: null, routines: [] });
    await user.type(await screen.findByLabelText(text.editor.name), 'Pierna');

    await user.press(screen.getByRole('button', { name: text.editor.addExercise }));
    expect(screen.getByRole('header', { name: catalog.search.addTo('Día A') })).toBeOnTheScreen();
    await user.press(await screen.findByRole('button', { name: 'Curl de bíceps' }));
    // #197: step 2 shows its defaults; «Listo» keeps them.
    expect(screen.getByLabelText(text.editor.fields.sets)).toHaveDisplayValue('2');
    await user.press(screen.getByRole('button', { name: common.ready }));
    await user.press(screen.getByRole('button', { name: text.editor.save }));

    expect(screen.getByText(dialogs.D15.title('Pierna'))).toBeOnTheScreen();
  });

  it('#256: with a full day «Agregar ejercicio» stays in the bottom bar, and at the limit it is disabled', async () => {
    const exercises = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        aRoutineExercise({ id: `re-${i}`, exerciseId: 'curl' }),
      );
    const full = aRoutine({ days: [aRoutineDay({ exercises: exercises(20) })] });
    await renderScreen({ routines: [full] });
    expect(screen.getByRole('button', { name: text.editor.addExercise })).toBeDisabled();
    expect(screen.getByTestId('editor-bottom-bar')).toContainElement(
      screen.getByRole('button', { name: text.editor.addExercise }),
    );
  });

  it('the day sheet: tapping the chosen day, or its options button, opens its options', async () => {
    const { user } = await renderScreen();
    await user.press(await screen.findByRole('button', { name: text.editor.day.options('Día A') }));

    expect(screen.getByLabelText(text.editor.day.name)).toBeOnTheScreen();
    // The only day: nothing to move or remove.
    expect(screen.queryByRole('button', { name: text.editor.day.remove })).not.toBeOnTheScreen();
  });

  it('RN-RUT-05 (#225): a day name keeps 20 characters at most, with its count', async () => {
    const { user } = await renderScreen();
    await user.press(await screen.findByRole('button', { name: text.editor.day.options('Día A') }));
    const field = screen.getByLabelText(text.editor.day.name);

    await user.clear(field);
    await user.type(field, 'Pecho, hombros y tríceps');

    expect(field).toHaveDisplayValue('Pecho, hombros y trí');
    expect(screen.getByText(text.editor.notesCount(20, 20))).toBeOnTheScreen();
  });

  it('#192: removing a day with exercises asks with D19 first', async () => {
    const { user } = await renderScreen();
    await user.press(await screen.findByRole('button', { name: text.editor.addDay }));
    await user.press(screen.getByRole('checkbox', { name: 'Día A' }));
    await user.press(screen.getByRole('button', { name: text.editor.day.options('Día A') }));

    await user.press(screen.getByRole('button', { name: text.editor.day.remove }));
    expect(screen.getByText(dialogs.D19.title('Día A'))).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: dialogs.D19.remove }));

    expect(screen.queryByRole('checkbox', { name: 'Día A' })).not.toBeOnTheScreen();
  });

  it('RF-RUT-05.AC1: dragging an exercise by its handle drops it in another position', async () => {
    const { user, routines } = await renderScreen();
    await screen.findByDisplayValue('Mi rutina de pierna');
    ['Prensa de piernas', 'Curl de bíceps'].forEach((name, index) =>
      fireEvent(screen.getByTestId(`row ${name}`), 'layout', {
        nativeEvent: { layout: { x: 0, y: index * 72, width: 358, height: 72 } },
      }),
    );

    fireGestureHandler(getByGestureTestId('drag Prensa de piernas'), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 40 },
      { state: State.ACTIVE, translationY: 80 },
      { state: State.END, translationY: 80 },
    ]);
    await user.press(screen.getByRole('button', { name: text.editor.save }));

    expect(routines.routines[0].days[0].exercises.map((e) => e.id)).toEqual(['re-2', 're-1']);
  });
});
