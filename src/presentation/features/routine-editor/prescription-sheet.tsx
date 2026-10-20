import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ROUTINE_LIMITS } from '@/domain/rules/routine-rules';
import { Button } from '@/presentation/components/button/button';
import { Chip } from '@/presentation/components/chip/chip';
import { Segmented } from '@/presentation/components/choice/segmented';
import { Notice } from '@/presentation/components/feedback/notice';
import { TextField } from '@/presentation/components/input/text-field';
import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import type {
  PrescriptionForm,
  PrescriptionSheet as Sheet,
} from '@/presentation/features/routine-editor/use-routine-editor-view-model';
import { common } from '@/presentation/strings/common';
import { routines as text } from '@/presentation/strings/routines';
import { colors, space, typography } from '@/presentation/theme';

/**
 * The rest chips, decided with the user for #33 (plan on the issue, 13 §10). All of them are inside
 * RN-RUT-04; a saved value off the list gets its own chip.
 */
const REST_OPTIONS = [60, 90, 120, 150, 180, 240, 300];
/** The share of the screen the sheet's content takes before it scrolls. */
const MAX_HEIGHT_RATIO = 0.72;
const NOTES_MAX = ROUTINE_LIMITS.notesLength.max;
const RIR_OPTIONS = [0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));
const ROLE_OPTIONS = (['main', 'accessory'] as const).map((role) => ({
  value: role,
  label: text.editor.roles[role],
}));

interface PrescriptionSheetProps {
  sheet: Sheet | null;
  exerciseName: string;
  effortMode: 'simple' | 'rir';
  onChange: (changes: Partial<PrescriptionForm>) => void;
  onSave: () => void;
  onReplace: () => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * S15 · Prescripción (hoja, Figma «SheetBody/Prescripción»): sets, rep range, target RIR and rest
 * in sight, with the errors next to their field (RN-RUT-04); role, notes, replace and remove under
 * «Más opciones», so the sheet stays short (#197). Right after picking an exercise it is step 2,
 * with «Listo»; closing it keeps the defaults.
 */
export function PrescriptionSheet({
  sheet,
  exerciseName,
  effortMode,
  onChange,
  onSave,
  onReplace,
  onRemove,
  onClose,
}: PrescriptionSheetProps) {
  const { height } = useWindowDimensions();
  const form = sheet?.form;
  const restOptions =
    form === undefined || REST_OPTIONS.includes(form.restSeconds)
      ? REST_OPTIONS
      : [...REST_OPTIONS, form.restSeconds].sort((a, b) => a - b);

  return (
    <BottomSheet
      visible={sheet !== null}
      title={exerciseName}
      subtitle={sheet ? text.editor.sheetSubtitle(sheet.form.role, sheet.dayName) : undefined}
      closeLabel={common.close}
      onClose={onClose}
    >
      {sheet && form && (
        // The sheet scrolls when it doesn't fit (decided for #33), without a scroll bar (#224).
        <ScrollView
          style={{ maxHeight: height * MAX_HEIGHT_RATIO }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.numbers}>
            <View style={styles.number}>
              <TextField
                label={text.editor.fields.sets}
                value={form.sets}
                onChangeText={(sets) => onChange({ sets })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.number}>
              <TextField
                label={text.editor.fields.repMin}
                value={form.repMin}
                onChangeText={(repMin) => onChange({ repMin })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.number}>
              <TextField
                label={text.editor.fields.repMax}
                value={form.repMax}
                onChangeText={(repMax) => onChange({ repMax })}
                keyboardType="number-pad"
              />
            </View>
          </View>
          {(sheet.errors.sets || sheet.errors.reps || sheet.errors.range) && (
            <View accessibilityLiveRegion="polite" style={styles.errors}>
              {sheet.errors.sets && <FieldError message={text.editor.validation.sets} />}
              {sheet.errors.reps && <FieldError message={text.editor.validation.reps} />}
              {sheet.errors.range && <FieldError message={text.editor.validation.minOverMax} />}
            </View>
          )}
          <Field
            label={
              effortMode === 'rir' ? text.editor.fields.reserveAdvanced : text.editor.fields.reserve
            }
          >
            <Segmented
              label={text.editor.fields.reserve}
              options={RIR_OPTIONS}
              selected={form.targetRir}
              onSelect={(targetRir) => onChange({ targetRir })}
            />
            {sheet.rirZeroWarning ? (
              <Notice tone="warn" message={text.editor.rirZeroWarning} />
            ) : (
              <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                {text.editor.reserveHelp(form.targetRir)}
              </Text>
            )}
          </Field>
          <Field label={text.editor.fields.rest}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {restOptions.map((seconds) => (
                <Chip
                  key={seconds}
                  label={text.editor.rest(seconds)}
                  selected={seconds === form.restSeconds}
                  onPress={() => onChange({ restSeconds: seconds })}
                />
              ))}
            </ScrollView>
          </Field>
          {/* Its own state per exercise: folded again for the next one; open with a note. */}
          <MoreOptions key={sheet.exercise.id} initiallyOpen={form.notes !== ''}>
            <Field label={text.editor.role}>
              <Segmented
                label={text.editor.role}
                options={ROLE_OPTIONS}
                selected={form.role}
                onSelect={(role) => onChange({ role })}
              />
            </Field>
            <TextField
              label={text.editor.notes}
              value={form.notes}
              onChangeText={(notes) =>
                onChange({ notes: Array.from(notes).slice(0, NOTES_MAX).join('') })
              }
              placeholder={text.editor.notesPlaceholder}
              help={text.editor.notesCount(Array.from(form.notes).length, NOTES_MAX)}
            />
            <View>
              <MenuItem icon="swap" label={text.editor.replace} onPress={onReplace} />
              <MenuItem icon="trash" label={text.editor.remove} onPress={onRemove} destructive />
            </View>
          </MoreOptions>
          <Button
            variant="primary"
            label={sheet.mode === 'add' ? common.ready : text.editor.save}
            onPress={onSave}
          />
        </ScrollView>
      )}
    </BottomSheet>
  );
}

/** «Más opciones»: role, notes, replace and remove, folded so the sheet stays short (#197). */
function MoreOptions({ initiallyOpen, children }: { initiallyOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <MenuItem
        icon={open ? 'up' : 'down'}
        label={text.editor.moreOptions}
        onPress={() => setOpen(!open)}
      />
      {open && children}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[typography.bodyMStrong, { color: colors.textPrimary }]}>{label}</Text>
      {children}
    </View>
  );
}

function FieldError({ message }: { message: string }) {
  return <Text style={[typography.bodyS, { color: colors.textErr }]}>{message}</Text>;
}

const styles = StyleSheet.create({
  content: { gap: space.s16, paddingBottom: space.s4 },
  field: { gap: space.s8 },
  numbers: { flexDirection: 'row', gap: space.s10 },
  number: { flex: 1 },
  errors: { gap: space.s4 },
  chips: { gap: space.s8 },
});
