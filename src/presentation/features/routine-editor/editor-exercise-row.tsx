import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { routines as text } from '@/presentation/strings/routines';
import { colors, radius, size, typography } from '@/presentation/theme';

interface EditorExerciseRowProps {
  name: string;
  /** «3 × 8–12 · reserva 2 · 2 min». */
  line: string;
  isFirst: boolean;
  isLast: boolean;
  /** Tapping the row opens the prescription. */
  onPress: () => void;
  onMove: (offset: -1 | 1) => void;
}

/**
 * Figma «EditorExerciseRow» (S15): the handle to drag, the exercise and its prescription, and
 * «Subir» / «Bajar» as the accessible alternative to dragging (RF-RUT-05.AC2).
 */
export function EditorExerciseRow({
  name,
  line,
  isFirst,
  isLast,
  onPress,
  onMove,
}: EditorExerciseRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.handle}>
        <Icon name="grip" size={20} color={colors.textSecondary} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityHint={line}
        onPress={onPress}
        style={styles.texts}
      >
        <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>{name}</Text>
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{line}</Text>
      </Pressable>
      <Arrow icon="up" label={text.editor.moveUp} disabled={isFirst} onPress={() => onMove(-1)} />
      <Arrow icon="down" label={text.editor.moveDown} disabled={isLast} onPress={() => onMove(1)} />
    </View>
  );
}

function Arrow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.arrow, disabled && styles.disabled]}
    >
      <Icon name={icon} size={20} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 72,
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 6,
    borderRadius: 14,
  },
  handle: { width: 44, height: size.targetMain, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 3, justifyContent: 'center', minHeight: size.targetMin },
  arrow: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  disabled: { opacity: 0.35 },
});
