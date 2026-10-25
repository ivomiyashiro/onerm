import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import type { Machine } from '@/domain/models/vocabulary';
import { Text } from '@/presentation/components/text';
import { catalog } from '@/presentation/strings/catalog';
import { colors, radius, space, typography } from '@/presentation/theme';

/**
 * One picture per machine (#306, ADR-0004 §6): illustrations generated for OneRM and reviewed one by
 * one, credited in S22. A machine without its picture yet shows nothing.
 */
const PICTURES: Partial<Record<Machine, ImageSourcePropType>> = {
  'leg-press': require('@/presentation/assets/machines/leg-press.jpg'),
  'chest-press': require('@/presentation/assets/machines/chest-press.jpg'),
};

/** RF-CAT-02 AC4: which machine to look for, and a line on how to recognize it. */
export function MachinePicture({ machine, height }: { machine: Machine; height: number }) {
  const picture = PICTURES[machine];
  if (picture === undefined) return null;
  const { picture: label, hint } = catalog.machines[machine];
  return (
    <View style={styles.machine}>
      <Image
        source={picture}
        style={[styles.picture, { height }]}
        resizeMode="cover"
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
      />
      <Text style={[typography.bodyS, { color: colors.textTertiary }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  machine: { gap: space.s6 },
  picture: {
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
});
