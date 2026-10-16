import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { RestRing } from '@/presentation/features/workout/rest-ring';
import { Chip } from '@/presentation/features/workout/rest-screen';
import type { RestView } from '@/presentation/features/workout/rest-view';
import { countdown } from '@/presentation/strings/numbers';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space, typography } from '@/presentation/theme';

interface RestBarProps {
  rest: RestView;
  remainingMs: number;
  onAdd: () => void;
  /** Back to the full screen. */
  onExpand: () => void;
}

/**
 * The minimized rest over «Hecho» (Figma «RestTimer»): the ring, the time, what comes next and
 * +15 s. Once it ended, the light card «¡Descanso terminado!» (Figma «S09 · Descanso terminado»).
 */
export function RestBar({ rest, remainingMs, onAdd, onExpand }: RestBarProps) {
  if (remainingMs <= 0) {
    return (
      <Pressable accessibilityRole="button" onPress={onExpand} style={styles.finished}>
        <View style={styles.check}>
          <Icon name="check" size={22} color={colors.bgAccent} />
        </View>
        <View style={styles.flex}>
          <Text style={[typography.titleM, { color: colors.textOnInverse }]}>
            {text.rest.finished}
          </Text>
          <Text style={[typography.bodyS, { color: colors.textOnInverse }]} numberOfLines={1}>
            {rest.nextText}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.bar}>
      <RestRing size={40} strokeWidth={4} progress={remainingMs / (rest.totalSeconds * 1000)} />
      <Pressable accessibilityRole="button" onPress={onExpand} style={styles.flex}>
        <Text style={[typography.monoL, { color: colors.textPrimary }]}>
          {countdown(remainingMs)}
        </Text>
        <Text style={[typography.bodyS, { color: colors.textSecondary }]} numberOfLines={1}>
          {rest.nextShort}
        </Text>
      </Pressable>
      <Chip label={text.rest.plus15} onPress={onAdd} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text.rest.openTimer}
        onPress={onExpand}
        style={styles.open}
      >
        <Icon name="chevron" size={20} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    paddingVertical: space.s8,
    paddingRight: space.s8,
    paddingLeft: space.s10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  flex: { flex: 1 },
  open: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  finished: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    paddingVertical: space.s12,
    paddingHorizontal: space.s14,
    borderRadius: 18,
    backgroundColor: colors.bgInverse,
  },
  check: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textOnInverse,
  },
});
