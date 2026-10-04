import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { colors, radius } from '@/presentation/theme';

/** Figma «Skeleton/Bloque»: pulses every 1.6 s, unless the system asks for less motion. */
export function SkeletonBlock({
  width,
  height,
  circle = false,
  testID,
}: {
  width: DimensionValue;
  height: number;
  circle?: boolean;
  testID?: string;
}) {
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotion) return;
    const half = (toValue: number) =>
      Animated.timing(opacity, { toValue, duration: 800, useNativeDriver: true });
    const pulse = Animated.loop(Animated.sequence([half(0.5), half(1)]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      testID={testID}
      style={[styles.block, { width, height, opacity }, circle && { borderRadius: height / 2 }]}
    />
  );
}

const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** Figma «Skeleton/Fila»: placeholder for a list row. */
export function SkeletonRow({ testID }: { testID?: string }) {
  return (
    <View testID={testID} style={styles.row} {...hidden}>
      <SkeletonBlock width={36} height={36} circle />
      <View style={styles.lines}>
        <SkeletonBlock width={180} height={12} />
        <SkeletonBlock width={110} height={12} />
      </View>
    </View>
  );
}

/** Figma «Skeleton/Tarjeta»: placeholder for a summary card. */
export function SkeletonCard({ testID }: { testID?: string }) {
  return (
    <View testID={testID} style={styles.card} {...hidden}>
      <SkeletonBlock width={80} height={10} />
      <SkeletonBlock width={200} height={36} />
      <SkeletonBlock width={140} height={12} />
      <SkeletonBlock width="80%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: 7, backgroundColor: colors.bgRaised },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 64, paddingHorizontal: 14 },
  lines: { flex: 1, gap: 8 },
  card: {
    gap: 12,
    padding: 18,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
});
