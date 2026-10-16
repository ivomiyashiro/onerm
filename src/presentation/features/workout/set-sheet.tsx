import { StyleSheet, View } from 'react-native';

import type { EffortMode } from '@/domain/models/vocabulary';
import { toUnit } from '@/domain/rules/units';
import type { WorkoutExerciseView } from '@/domain/usecases/observe-workout';
import { Button } from '@/presentation/components/button/button';
import { Segmented } from '@/presentation/components/choice/segmented';
import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';
import { LoadStepper } from '@/presentation/components/stepper/load-stepper';
import { SwitchRow } from '@/presentation/components/choice/switch-row';
import { Text } from '@/presentation/components/text';
import {
  EFFORT_VALUES,
  maxLoadText,
  setRir,
  stepLoad,
  stepReps,
  typeLoad,
  type RepsField,
  type RirField,
  type SetForm,
  type SetFormErrors,
} from '@/presentation/features/workout/set-form';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { loadNumber } from '@/presentation/strings/numbers';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space, typography } from '@/presentation/theme';

/** S09 «Ajustar serie» or «Editar serie n»; S19 uses the same sheet (RF-PROG-03). */
export type SetSheetState =
  | { kind: 'adjust'; form: SetForm; errors: SetFormErrors | null }
  | { kind: 'edit'; number: number; form: SetForm; errors: SetFormErrors | null };

/** What the sheet reads of the exercise: the copy, its name, catalog entry and ± step. */
export type SetSheetExercise = Pick<WorkoutExerciseView, 'exercise' | 'name' | 'catalog' | 'grid'> &
  /** In S09 only: a past set (S19) is never in calibration. */
  Partial<Pick<WorkoutExerciseView, 'suggestion'>>;

interface SetSheetProps {
  sheet: SetSheetState | null;
  exercise: SetSheetExercise;
  /** «Serie n de total» of the current set. */
  setNumber: number;
  setTotal: number;
  effortMode: EffortMode;
  onChange: (change: (form: SetForm) => SetForm) => void;
  onConfirm: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** RN-ENT-05: the load convention next to the load (ADR-0008). */
export function loadConvention(
  view: Pick<SetSheetExercise, 'catalog' | 'exercise'>,
): string | undefined {
  const equipment = view.catalog?.primaryEquipment;
  if (equipment === 'dumbbell') return common.loadUnit.perDumbbell;
  if (view.exercise.isUnilateral) return common.loadUnit.perSide;
  if (equipment === 'barbell') return common.loadUnit.totalWithBar;
  return undefined;
}

/**
 * S09 «Ajustar serie» and «Editar serie» (Figma «SheetBody/Ajustar serie», marca §12): load and
 * reps steps, «Distinto por lado» for unilateral exercises, warm-up, optional effort, and «Hecho»
 * or «Guardar cambios». The error of a value goes in its step (RF-ENT-02.AC5).
 */
export function SetSheet({
  sheet,
  exercise,
  setNumber,
  setTotal,
  effortMode,
  onChange,
  onConfirm,
  onDelete,
  onClose,
}: SetSheetProps) {
  const { exercise: planned, grid } = exercise;
  const form = sheet?.form;
  const name = exercise.name ?? catalog.detail.unavailable;
  const title =
    sheet?.kind === 'edit' ? text.editSet.title(sheet.number) : text.set.setOf(setNumber, setTotal);
  const unit = grid?.unit ?? 'kg';
  const range = planned.prescription.repRange;

  // Without a load the field is empty and «—» is its placeholder, so typing starts clean (#140).
  const loadValue = (value: SetForm) =>
    value.loadText ??
    (value.loadKg === null || Number.isNaN(value.loadKg)
      ? ''
      : loadNumber(toUnit(value.loadKg, unit), unit));

  const repsStep = (value: SetForm, field: RepsField, label: string) => (
    <LoadStepper
      label={label}
      value={String(value[field])}
      note={sheet?.errors?.reps ? text.validation.reps : text.stepNotes.range(range.min, range.max)}
      error={sheet?.errors?.reps}
      decrementLabel={text.set.decreaseReps}
      incrementLabel={text.set.increaseReps}
      onDecrement={() => onChange((f) => stepReps(f, field, -1))}
      onIncrement={() => onChange((f) => stepReps(f, field, 1))}
    />
  );

  const effort = (value: SetForm, field: RirField, label?: string) => (
    <View style={styles.effortRow}>
      {label && (
        <Text style={[typography.label, styles.side]} accessibilityElementsHidden>
          {label}
        </Text>
      )}
      <View style={styles.flex}>
        <Segmented
          label={label ?? effortTitle(effortMode)}
          options={effortOptions(effortMode)}
          selected={value[field] ?? -1}
          onSelect={(rir) => onChange((f) => setRir(f, field, rir))}
        />
      </View>
    </View>
  );

  return (
    <BottomSheet
      visible={sheet !== null}
      title={title}
      subtitle={name}
      closeLabel={common.close}
      onClose={onClose}
    >
      {form && (
        <View style={styles.content}>
          <View style={styles.steps}>
            {grid !== null && (
              <LoadStepper
                label={text.set.load}
                value={loadValue(form)}
                placeholder={text.set.noLoad}
                unit={common.units[unit]}
                note={
                  sheet?.errors?.load
                    ? text.validation.load(maxLoadText(unit), common.units[unit])
                    : loadConvention(exercise)
                }
                error={sheet?.errors?.load}
                decrementLabel={text.set.decreaseLoad}
                incrementLabel={text.set.increaseLoad}
                onDecrement={() => onChange((f) => stepLoad(f, grid, -1))}
                onIncrement={() => onChange((f) => stepLoad(f, grid, 1))}
                onChangeText={(typed) => onChange((f) => typeLoad(f, typed, grid))}
              />
            )}
            {(!planned.isUnilateral || !form.split) && repsStep(form, 'reps', text.set.reps)}
          </View>
          {grid === null && (
            <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
              {text.set.bodyweight}
            </Text>
          )}
          {planned.isUnilateral && form.split && (
            <View style={styles.steps}>
              {repsStep(form, 'repsLeft', text.set.repsLeft)}
              {repsStep(form, 'repsRight', text.set.repsRight)}
            </View>
          )}
          {planned.isUnilateral && (
            <SwitchRow
              label={text.set.differentPerSide}
              value={form.split}
              onChange={(split) => onChange((f) => ({ ...f, split }))}
            />
          )}
          {!isCalibrating(exercise) && (
            <SwitchRow
              label={text.set.warmUp}
              value={form.isWarmup}
              onChange={(isWarmup) => onChange((f) => ({ ...f, isWarmup }))}
            />
          )}
          <View style={styles.field}>
            <Text style={[typography.bodyMStrong, { color: colors.textPrimary }]}>
              {effortTitle(effortMode)}
            </Text>
            {planned.isUnilateral && form.split ? (
              <>
                {effort(form, 'rirLeft', text.set.left)}
                {effort(form, 'rirRight', text.set.right)}
              </>
            ) : (
              effort(form, 'rir')
            )}
          </View>
          <Button
            variant="primary"
            size="xl"
            label={sheet?.kind === 'edit' ? text.editSet.saveChanges : text.primaryAction.done}
            icon={sheet?.kind === 'edit' ? undefined : 'check'}
            onPress={onConfirm}
          />
          {sheet?.kind === 'edit' && (
            <MenuItem icon="trash" label={text.editSet.delete} onPress={onDelete} destructive />
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const CALIBRATION_CODES = new Set([
  'CALIBRATION',
  'CALIBRATION_STEP',
  'CALIBRATION_STEP_DOWN',
  'BODYWEIGHT_CALIBRATION',
]);

/** RN-ENT-12: the warm-up switch is not available during the calibration. */
function isCalibrating(view: SetSheetExercise): boolean {
  return view.suggestion !== undefined && CALIBRATION_CODES.has(view.suggestion.reason.code);
}

export function effortTitle(mode: EffortMode): string {
  return mode === 'simple' ? text.effort.simpleQuestion : text.effort.rirTitle;
}

/** RN-ENT-03: the four answers of the simple scale, or 0–5+ (13 §3). */
export function effortOptions(mode: EffortMode): { value: number; label: string }[] {
  const labels =
    mode === 'simple'
      ? [
          text.effort.simple.none,
          text.effort.simple.one,
          text.effort.simple.twoOrThree,
          text.effort.simple.fourOrMore,
        ]
      : text.effort.rir;
  return EFFORT_VALUES[mode].map((value, i) => ({ value, label: labels[i] }));
}

const styles = StyleSheet.create({
  content: { gap: space.s14, paddingBottom: space.s4 },
  steps: { flexDirection: 'row', gap: space.s10 },
  field: { gap: space.s8 },
  effortRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  side: { width: 32, color: colors.textSecondary },
  flex: { flex: 1 },
});
