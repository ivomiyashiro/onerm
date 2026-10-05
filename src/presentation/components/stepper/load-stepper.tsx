import { StyleSheet, View } from 'react-native';

import { Plate } from '@/presentation/components/stepper/plate';
import { colors, radius, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

interface LoadStepperProps {
  label: string;
  /** Already formatted for display ("62,5"). */
  value: string;
  unit?: string;
  /** What the change means ("Subimos 2,5 kg") or, with `error`, what is wrong. */
  note?: string;
  error?: boolean;
  decrementLabel: string;
  incrementLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

/** Figma «LoadStepper»: load or reps with their ± plates. */
export function LoadStepper({
  label,
  value,
  unit,
  note,
  error = false,
  decrementLabel,
  incrementLabel,
  onDecrement,
  onIncrement,
}: LoadStepperProps) {
  return (
    <View style={[styles.card, error && styles.cardError]}>
      <View accessible accessibilityLabel={[label, value, unit].filter(Boolean).join(' ')}>
        <Text style={[typography.label, styles.label]}>{label}</Text>
        <View style={styles.value}>
          <Text style={[typography.numberHero, { color: colors.textPrimary }]}>{value}</Text>
          {unit && (
            <Text style={[typography.bodyLStrong, { color: colors.textSecondary }]}>{unit}</Text>
          )}
        </View>
      </View>
      {note && (
        <Text
          style={[
            typography.bodyS,
            styles.note,
            { color: error ? colors.textErr : colors.textSecondary },
          ]}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
        >
          {note}
        </Text>
      )}
      <View style={styles.plates}>
        <Plate sign="minus" accessibilityLabel={decrementLabel} onPress={onDecrement} />
        <Plate sign="plus" accessibilityLabel={incrementLabel} onPress={onIncrement} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  cardError: { borderColor: colors.borderErr },
  label: { color: colors.textSecondary, textAlign: 'center' },
  value: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 3,
    minHeight: 56,
  },
  note: { textAlign: 'center' },
  plates: { flexDirection: 'row', gap: 10 },
});
