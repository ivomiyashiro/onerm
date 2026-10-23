import { act, fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import { AccessibilityInfo, LayoutAnimation, TextInput } from 'react-native';
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

// The rows ask whether their screen is focused (#257); there is no navigator here.
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useIsFocused: () => true,
}));

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

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
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

  it('RF-RUT-05.AC2: «Subir» glides the rows to their new places', async () => {
    const configureNext = jest.spyOn(LayoutAnimation, 'configureNext').mockClear();
    await renderScreen();
    await screen.findByDisplayValue('Mi rutina de pierna');

    await act(() => rowAction('Curl de bíceps', 'moveUp'));

    expect(configureNext).toHaveBeenCalledTimes(1);
  });

  it('RF-RUT-05.AC2: with «Reducir movimiento» the order changes at once', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const configureNext = jest.spyOn(LayoutAnimation, 'configureNext').mockClear();
    await renderScreen();
    await screen.findByDisplayValue('Mi rutina de pierna');
    await act(async () => {});

    await act(() => rowAction('Curl de bíceps', 'moveUp'));

    expect(configureNext).not.toHaveBeenCalled();
    // Moved first: it can no longer go up.
    expect(screen.getByRole('button', { name: 'Curl de bíceps' })).not.toHaveProp(
      'accessibilityActions',
      expect.arrayContaining([expect.objectContaining({ name: 'moveUp' })]),
    );
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

  it('#270: the prescription sheet keeps its button out of the scroll, so the keyboard never hides it', async () => {
    const { user } = await renderScreen();
    await user.press(await screen.findByRole('button', { name: 'Prensa de piernas' }));

    const sheet = within(screen.getByTestId('prescription-sheet'));
    const body = within(screen.getByTestId('prescription-sheet-body'));
    expect(body.getByLabelText(text.editor.fields.sets)).toBeOnTheScreen();
    expect(body.queryByRole('button', { name: text.editor.save })).not.toBeOnTheScreen();
    expect(sheet.getByRole('button', { name: text.editor.save })).toBeOnTheScreen();
  });

  it('#270: «Siguiente» on the keyboard moves from the sets to the minimum and to the maximum', async () => {
    const focused: string[] = [];
    // Which field each focus() lands on: the Jest TextInput has no real focus.
    const focus = jest.spyOn(TextInput.prototype, 'focus').mockImplementation(function (
      this: TextInput,
    ) {
      focused.push(this.props.accessibilityLabel ?? '');
    });
    const { user } = await renderScreen();
    await user.press(await screen.findByRole('button', { name: 'Prensa de piernas' }));

    await fireEvent(screen.getByLabelText(text.editor.fields.sets), 'submitEditing');
    await fireEvent(screen.getByLabelText(text.editor.fields.repMin), 'submitEditing');

    expect(focused).toEqual([text.editor.fields.repMin, text.editor.fields.repMax]);
    focus.mockRestore();
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

  it('#256: the list header counts the exercises and offers «Agregar ejercicio» at the top', async () => {
    await renderScreen();
    expect(screen.getByText(text.editor.exerciseCount(2))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: text.editor.addExercise })).toBeEnabled();
  });

  it('#256: an empty day also shows the header with «Agregar ejercicio»', async () => {
    await renderScreen({ routineId: null, routines: [] });
    expect(screen.getByText(text.editor.exerciseCount(0))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: text.editor.addExercise })).toBeEnabled();
  });

  it('#256: at the limit of exercises in a day «Agregar ejercicio» is disabled', async () => {
    const exercises = Array.from({ length: 20 }, (_, i) =>
      aRoutineExercise({ id: `re-${i}`, exerciseId: 'curl' }),
    );
    const full = aRoutine({ days: [aRoutineDay({ exercises })] });
    await renderScreen({ routines: [full] });
    expect(screen.getByText(text.editor.exerciseCount(20))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: text.editor.addExercise })).toBeDisabled();
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

  it('RF-RUT-05.AC2: the rows carry no reorder help text, screen readers get «Subir» and «Bajar»', async () => {
    await renderScreen();
    await screen.findByDisplayValue('Mi rutina de pierna');

    expect(screen.queryByText(/Arrastrá desde el asa/)).not.toBeOnTheScreen();
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
