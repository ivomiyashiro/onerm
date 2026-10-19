import { useEffect, useRef, useState } from 'react';

import type { Exercise } from '@/domain/models/exercise';
import type { Routine, RoutineExercise } from '@/domain/models/routine';
import type { ExerciseRole, Id } from '@/domain/models/vocabulary';
import { validatePrescription } from '@/domain/rules/prescription-rules';
import {
  hasAccessoryBeforeMain,
  moveDay,
  moveExercise,
  moveExerciseTo,
  removeDay,
  removeExercise,
  renameDay,
  replaceExercise,
  updateExercise,
} from '@/domain/rules/routine/routine-edits';
import type { RoutineDraft } from '@/domain/usecases/routine-draft';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

/** What the prescription sheet edits, as typed: the numbers are checked on «Guardar». */
export interface PrescriptionForm {
  role: ExerciseRole;
  sets: string;
  repMin: string;
  repMax: string;
  targetRir: number;
  restSeconds: number;
  notes: string;
}

export interface PrescriptionSheet {
  /** `add`: step 2 right after picking it, with its defaults already in (#197). */
  mode: 'add' | 'edit';
  exercise: RoutineExercise;
  dayName: string;
  form: PrescriptionForm;
  /** RF-RUT-03.AC3: next to each field (RN-RUT-04). */
  errors: { sets: boolean; reps: boolean; range: boolean };
  /** RF-RUT-03.AC7: informative, it never blocks. */
  rirZeroWarning: boolean;
}

export type EditorState =
  | { status: 'loading' }
  | { status: 'error' }
  /** Deleted, maybe on another device, while the editor was opening. */
  | { status: 'missing' }
  | {
      status: 'content';
      routine: Routine;
      isNew: boolean;
      selectedDayId: Id;
      /** RF-RUT-04.AC2 (RN-RUT-06). */
      workoutInProgress: boolean;
      /** RF-RUT-05.AC4. */
      orderHint: boolean;
      /** The catalog name, or null for an exercise not in the local catalog (RN-CAT-04). */
      nameOf: (exerciseId: Id) => string | null;
      /** «Repeticiones en reserva», or the RIR label in the numeric effort mode (RN-PERF-04). */
      effortMode: 'simple' | 'rir';
      /** After a failed «Guardar» (RF-RUT-03.AC3, AC4). */
      errors: { name: boolean; emptyDayId: Id | null };
    };

/** D08, D15, D14 and D19. */
export type EditorDialog =
  | { kind: 'discard' }
  | { kind: 'activate'; routineName: string }
  | { kind: 'workoutInProgress' }
  | { kind: 'removeDay'; dayName: string; exercises: number };

/** S16 over the editor: the exercise to add to the selected day, or to put in place of another. */
export type ExercisePicker =
  { mode: 'add'; dayName: string } | { mode: 'replace'; dayName: string; routineExerciseId: Id };

export interface RoutineEditorViewModel {
  state: EditorState;
  dialog: EditorDialog | null;
  /** The routine exercise being edited (S15 · Prescripción). */
  sheet: PrescriptionSheet | null;
  /** The day of «S15 · Opciones del día». */
  daySheetOpen: boolean;
  picker: ExercisePicker | null;
  actions: {
    setName(name: string): void;
    selectDay(dayId: Id): void;
    addDay(): void;
    openDaySheet(): void;
    closeDaySheet(): void;
    renameDay(name: string): void;
    moveDay(offset: -1 | 1): void;
    removeDay(): void;
    moveExercise(routineExerciseId: Id, offset: -1 | 1): void;
    moveExerciseTo(routineExerciseId: Id, index: number): void;
    openPicker(): void;
    closePicker(): void;
    pick(exercise: Exercise): void;
    openExercise(routineExerciseId: Id): void;
    closeExercise(): void;
    editForm(changes: Partial<PrescriptionForm>): void;
    applyExercise(): void;
    replaceExercise(): void;
    /** From its sheet or swiping its row (#198). */
    removeExercise(routineExerciseId: Id): void;
    save(): Promise<void>;
    /** The top bar's back and the system back: D08 when there are changes (RF-RUT-03.AC5). */
    back(): void;
    confirmDialog(): Promise<void>;
    dismissDialog(): void;
    goToWorkout(): void;
    retry(): void;
  };
}

interface Editing {
  draft: RoutineDraft;
  routine: Routine;
  selectedDayId: Id;
  dirty: boolean;
  errors: { name: boolean; emptyDayId: Id | null };
}

const NO_ERRORS = { name: false, emptyDayId: null };

function formOf({ prescription, notes }: RoutineExercise): PrescriptionForm {
  return {
    role: prescription.role,
    sets: String(prescription.sets),
    repMin: String(prescription.repRange.min),
    repMax: String(prescription.repRange.max),
    targetRir: prescription.targetRir,
    restSeconds: prescription.restSeconds,
    notes: notes ?? '',
  };
}

/** Whole numbers only: «3.5» or an empty field fail the limits (RN-RUT-04). */
const whole = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : Number.NaN);

function prescriptionOf(form: PrescriptionForm) {
  return {
    role: form.role,
    sets: whole(form.sets),
    repRange: { min: whole(form.repMin), max: whole(form.repMax) },
    restSeconds: form.restSeconds,
    targetRir: form.targetRir,
  };
}

function errorsOf(form: PrescriptionForm): PrescriptionSheet['errors'] {
  const codes = validatePrescription(prescriptionOf(form)).map((v) => v.code);
  const { min, max } = prescriptionOf(form).repRange;
  // A floor above a cap that are both valid reps is the «mínimo mayor que el máximo» case.
  const range = min > max && min <= 30 && max >= 1;
  return {
    sets: codes.includes('prescription.sets'),
    reps:
      codes.includes('prescription.repMin') || (codes.includes('prescription.repMax') && !range),
    range,
  };
}

/** S15 · Editor de rutina (RF-RUT-03..06). `routineId` null creates a routine. */
export function useRoutineEditorViewModel(
  routineId: Id | null,
  navigation: { onClose: () => void; onGoToWorkout: () => void },
): RoutineEditorViewModel {
  const { loadRoutineDraft, editRoutineDraft, saveRoutine, activateRoutine } = useUseCases();
  const [load, setLoad] = useState<'loading' | 'error' | 'missing' | 'ready'>('loading');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dialog, setDialog] = useState<EditorDialog | null>(null);
  const [sheetFor, setSheetFor] = useState<{
    id: Id;
    form: PrescriptionForm;
    mode: PrescriptionSheet['mode'];
  } | null>(null);
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [picker, setPicker] = useState<ExercisePicker | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Refs, not state: two taps in the same frame must not save or activate twice.
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    loadRoutineDraft.execute(routineId).then(
      (draft) => {
        if (!active) return;
        if (draft === null) return setLoad('missing');
        setEditing({
          draft,
          routine: draft.routine,
          selectedDayId: draft.routine.days[0]?.id ?? '',
          dirty: false,
          errors: NO_ERRORS,
        });
        setLoad('ready');
      },
      () => active && setLoad('error'),
    );
    return () => {
      active = false;
    };
  }, [loadRoutineDraft, routineId, attempt]);

  /** Every edit marks the draft as changed (D08) and clears the errors of the last «Guardar». */
  function edit(change: (current: Editing) => Pick<Editing, 'routine'> & Partial<Editing>) {
    setEditing(
      (current) => current && { ...current, ...change(current), dirty: true, errors: NO_ERRORS },
    );
  }

  function editRoutine(change: (routine: Routine, current: Editing) => Routine) {
    edit((current) => ({ routine: change(current.routine, current) }));
  }

  const selectedDay = editing?.routine.days.find((day) => day.id === editing.selectedDayId);
  const editedExercise =
    sheetFor === null
      ? undefined
      : editing?.routine.days
          .flatMap((day) => day.exercises.map((exercise) => ({ exercise, day })))
          .find(({ exercise }) => exercise.id === sheetFor.id);

  const state: EditorState =
    load !== 'ready' || editing === null
      ? { status: load === 'ready' ? 'loading' : load }
      : {
          status: 'content',
          routine: editing.routine,
          isNew: editing.draft.isNew,
          selectedDayId: editing.selectedDayId,
          workoutInProgress: editing.draft.workoutInProgress,
          orderHint: hasAccessoryBeforeMain(editing.routine),
          nameOf: (id) => editing.draft.exercises.get(id)?.name ?? null,
          effortMode: editing.draft.profile.effortMode,
          errors: editing.errors,
        };

  const sheet: PrescriptionSheet | null =
    sheetFor === null || editedExercise === undefined
      ? null
      : {
          mode: sheetFor.mode,
          exercise: editedExercise.exercise,
          dayName: editedExercise.day.name,
          form: sheetFor.form,
          errors: errorsOf(sheetFor.form),
          rirZeroWarning: sheetFor.form.targetRir === 0,
        };

  async function save() {
    if (editing === null || busy.current) return;
    busy.current = true;
    try {
      const result = await saveRoutine.execute(editing.routine);
      if (result.status === 'invalid') {
        const emptyDay = result.violations.find((v) => v.code === 'day.exercises');
        const emptyDayId =
          emptyDay === undefined
            ? null
            : (editing.routine.days[emptyDay.path[1] as number]?.id ?? null);
        const name = result.violations.some((v) => v.code === 'routine.name');
        // RN-RUT-05 (#225): a day named before the 20 character limit shows its error in its sheet.
        const longDay = result.violations.find((v) => v.code === 'day.name');
        const longDayId =
          longDay === undefined
            ? null
            : (editing.routine.days[longDay.path[1] as number]?.id ?? null);
        // Functional: an edit made while saving is kept.
        setEditing(
          (current) =>
            current && {
              ...current,
              selectedDayId: emptyDayId ?? longDayId ?? current.selectedDayId,
              errors: { name, emptyDayId },
            },
        );
        if (emptyDayId === null && longDayId !== null) setDaySheetOpen(true);
      } else if (editing.draft.isNew) {
        setEditing((current) => current && { ...current, dirty: false });
        setDialog({ kind: 'activate', routineName: editing.routine.name.trim() });
      } else {
        navigation.onClose();
      }
    } catch {
      // A failed local write: the editor stays with the changes, so nothing is lost.
    } finally {
      busy.current = false;
    }
  }

  async function activate() {
    if (editing === null || busy.current) return;
    busy.current = true;
    try {
      const result = await activateRoutine.execute(editing.routine.id);
      if (result.status === 'workoutInProgress') setDialog({ kind: 'workoutInProgress' });
      else navigation.onClose();
    } catch {
      // The routine is saved; it just isn't active. The user can activate it from S13.
      navigation.onClose();
    } finally {
      busy.current = false;
    }
  }

  function removeSelectedDay() {
    edit(({ routine, selectedDayId }) => {
      const index = routine.days.findIndex((day) => day.id === selectedDayId);
      const next = removeDay(routine, selectedDayId);
      // The day before is selected, or the new first one.
      return { routine: next, selectedDayId: next.days[Math.max(0, index - 1)]?.id ?? '' };
    });
  }

  return {
    state,
    dialog,
    sheet,
    daySheetOpen,
    picker,
    actions: {
      setName: (name) => editRoutine((routine) => ({ ...routine, name })),
      selectDay: (dayId) =>
        setEditing((current) => current && { ...current, selectedDayId: dayId }),
      addDay: () =>
        edit(({ routine }) => {
          const next = editRoutineDraft.addDay(routine);
          return { routine: next, selectedDayId: next.days[next.days.length - 1].id };
        }),
      openDaySheet: () => setDaySheetOpen(true),
      closeDaySheet: () => setDaySheetOpen(false),
      renameDay: (name) =>
        editRoutine((routine, current) => renameDay(routine, current.selectedDayId, name)),
      moveDay: (offset) =>
        editRoutine((routine, current) => moveDay(routine, current.selectedDayId, offset)),
      removeDay: () => {
        setDaySheetOpen(false);
        // A day with exercises asks first (D19, #192); an empty one goes at once.
        const selected = editing?.routine.days.find((d) => d.id === editing.selectedDayId);
        if (selected && selected.exercises.length > 0) {
          setDialog({
            kind: 'removeDay',
            dayName: selected.name,
            exercises: selected.exercises.length,
          });
          return;
        }
        removeSelectedDay();
      },
      moveExercise: (id, offset) => editRoutine((routine) => moveExercise(routine, id, offset)),
      moveExerciseTo: (id, index) => editRoutine((routine) => moveExerciseTo(routine, id, index)),
      openPicker: () => selectedDay && setPicker({ mode: 'add', dayName: selectedDay.name }),
      closePicker: () => setPicker(null),
      pick: (exercise) => {
        if (picker?.mode === 'replace') {
          const id = picker.routineExerciseId;
          editRoutine((routine) => replaceExercise(routine, id, exercise.id));
        } else if (editing) {
          // Step 1 adds it with its defaults (RF-RUT-03.AC2); step 2 shows them to change, and
          // closing it keeps them (#197).
          const { routine, selectedDayId, draft } = editing;
          const next = editRoutineDraft.addExercise(
            routine,
            selectedDayId,
            exercise,
            draft.profile,
          );
          editRoutine(() => next);
          const added = next.days.find((day) => day.id === selectedDayId)?.exercises.at(-1);
          if (added) setSheetFor({ id: added.id, form: formOf(added), mode: 'add' });
        }
        setPicker(null);
      },
      openExercise: (id) => {
        const found = editing?.routine.days.flatMap((d) => d.exercises).find((e) => e.id === id);
        if (found) setSheetFor({ id, form: formOf(found), mode: 'edit' });
      },
      closeExercise: () => setSheetFor(null),
      editForm: (changes) =>
        setSheetFor((current) => current && { ...current, form: { ...current.form, ...changes } }),
      applyExercise: () => {
        if (sheet === null) return;
        const { sets, reps, range } = sheet.errors;
        if (sets || reps || range) return;
        const notes = sheet.form.notes.trim();
        editRoutine((routine) =>
          updateExercise(routine, sheet.exercise.id, {
            prescription: prescriptionOf(sheet.form),
            notes: notes === '' ? null : notes,
          }),
        );
        setSheetFor(null);
      },
      replaceExercise: () =>
        sheet &&
        setPicker({
          mode: 'replace',
          dayName: sheet.dayName,
          routineExerciseId: sheet.exercise.id,
        }),
      removeExercise: (id) => {
        editRoutine((routine) => removeExercise(routine, id));
        setSheetFor(null);
      },
      save,
      back: () => {
        if (editing?.dirty) setDialog({ kind: 'discard' });
        else navigation.onClose();
      },
      confirmDialog: async () => {
        if (dialog?.kind === 'removeDay') {
          setDialog(null);
          removeSelectedDay();
        } else if (dialog?.kind === 'discard') {
          setDialog(null);
          navigation.onClose();
        } else if (dialog?.kind === 'activate') {
          setDialog(null);
          await activate();
        } else {
          setDialog(null);
          navigation.onClose();
        }
      },
      dismissDialog: () => {
        const kind = dialog?.kind;
        setDialog(null);
        // «Ahora no» (D15) and «Cancelar» (D14): the routine is saved, so the editor closes.
        if (kind === 'activate' || kind === 'workoutInProgress') navigation.onClose();
      },
      goToWorkout: () => {
        setDialog(null);
        navigation.onGoToWorkout();
      },
      retry: () => {
        setLoad('loading');
        setAttempt((n) => n + 1);
      },
    },
  };
}
