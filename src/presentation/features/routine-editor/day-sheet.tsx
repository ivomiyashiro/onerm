import { StyleSheet, View } from 'react-native';

import type { RoutineDay } from '@/domain/models/routine';
import { ROUTINE_LIMITS } from '@/domain/rules/routine-rules';
import { TextField } from '@/presentation/components/input/text-field';
import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';
import { common } from '@/presentation/strings/common';
import { routines as text } from '@/presentation/strings/routines';
import { space } from '@/presentation/theme';

interface DaySheetProps {
  visible: boolean;
  day: RoutineDay | undefined;
  /** The only day can't be removed: a routine has at least one (RN-RUT-05). */
  canRemove: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * S15 · Opciones del día (Figma «SheetBody/Día», decided for #33): the day's name and removing it
 * (RF-RUT-04.AC1). Its place in the rotation (RF-RUT-05.AC3) is moved by dragging its chip (#271).
 */
export function DaySheet({ visible, day, canRemove, onRename, onRemove, onClose }: DaySheetProps) {
  if (day === undefined) return null;
  return (
    <BottomSheet
      visible={visible}
      title={day.name}
      subtitle={text.editor.day.exercises(day.exercises.length)}
      closeLabel={common.close}
      onClose={onClose}
    >
      <View style={styles.content}>
        <TextField
          label={text.editor.day.name}
          value={day.name}
          // RN-RUT-05 (#225): 20 characters, so it fits two lines in the card of Inicio.
          onChangeText={(name) =>
            onRename(Array.from(name).slice(0, ROUTINE_LIMITS.dayNameLength.max).join(''))
          }
          error={
            day.name.trim() === ''
              ? text.editor.validation.emptyName
              : Array.from(day.name.trim()).length > ROUTINE_LIMITS.dayNameLength.max
                ? text.editor.validation.longDayName
                : undefined
          }
          help={text.editor.notesCount(
            Array.from(day.name).length,
            ROUTINE_LIMITS.dayNameLength.max,
          )}
        />
        <View style={styles.actions}>
          {canRemove && (
            <MenuItem icon="trash" label={text.editor.day.remove} onPress={onRemove} destructive />
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.s16 },
  actions: { gap: space.s6 },
});
