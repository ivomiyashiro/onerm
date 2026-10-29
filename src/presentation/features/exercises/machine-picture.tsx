import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import type { Machine } from '@/domain/models/vocabulary';
import { Text } from '@/presentation/components/text';
import { catalog } from '@/presentation/strings/catalog';
import { colors, radius, space, typography } from '@/presentation/theme';

/**
 * One picture per machine (#306, ADR-0004 §6): illustrations generated for OneRM and reviewed one by
 * one, credited in S22. A `Record`, so a new machine can't ship without its picture.
 */
const PICTURES: Record<Machine, ImageSourcePropType> = {
  'leg-press': require('@/presentation/assets/machines/leg-press.jpg'),
  'hack-squat': require('@/presentation/assets/machines/hack-squat.jpg'),
  smith: require('@/presentation/assets/machines/smith.jpg'),
  'leg-extension': require('@/presentation/assets/machines/leg-extension.jpg'),
  'leg-curl-seated': require('@/presentation/assets/machines/leg-curl-seated.jpg'),
  'leg-curl-lying': require('@/presentation/assets/machines/leg-curl-lying.jpg'),
  'calf-raise-standing': require('@/presentation/assets/machines/calf-raise-standing.jpg'),
  'calf-raise-seated': require('@/presentation/assets/machines/calf-raise-seated.jpg'),
  'hip-thrust': require('@/presentation/assets/machines/hip-thrust.jpg'),
  'hip-abduction': require('@/presentation/assets/machines/hip-abduction.jpg'),
  'hip-adduction': require('@/presentation/assets/machines/hip-adduction.jpg'),
  'chest-press': require('@/presentation/assets/machines/chest-press.jpg'),
  'incline-chest-press': require('@/presentation/assets/machines/incline-chest-press.jpg'),
  'pec-deck': require('@/presentation/assets/machines/pec-deck.jpg'),
  'shoulder-press': require('@/presentation/assets/machines/shoulder-press.jpg'),
  pullover: require('@/presentation/assets/machines/pullover.jpg'),
  'lat-pulldown': require('@/presentation/assets/machines/lat-pulldown.jpg'),
  'seated-row': require('@/presentation/assets/machines/seated-row.jpg'),
  'chest-supported-row': require('@/presentation/assets/machines/chest-supported-row.jpg'),
  'preacher-curl': require('@/presentation/assets/machines/preacher-curl.jpg'),
};

/** RF-CAT-02 AC4: which machine to look for, and a line on how to recognize it. */
export function MachinePicture({ machine, height }: { machine: Machine; height: number }) {
  const { picture: label, hint } = catalog.machines[machine];
  return (
    <View style={styles.machine}>
      <Image
        source={PICTURES[machine]}
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
