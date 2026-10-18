import { StyleSheet, TextInput, View } from 'react-native';

import { Plate } from '@/presentation/components/stepper/plate';
import { colors, radius, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

interface LoadStepperProps {
  label: string;
  /** Already formatted for display ("62,5"); empty without a value. */
  value: string;
  /** Shown greyed while there is no value ("0"): never part of what is typed (#140, #195). */
  placeholder?: string;
  unit?: string;
  /** What the change means ("Subimos 2,5 kg") or, with `error`, what is wrong. */
  note?: string;
  error?: boolean;
  decrementLabel: string;
  incrementLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  /** With it, the value can also be typed with the numeric keyboard (RF-ENT-02.AC3). */
  onChangeText?: (text: string) => void;
}

/** Figma «LoadStepper»: load or reps with their ± plates. */
export function LoadStepper({
  label,
  value,
  placeholder,
  unit,
  note,
  error = false,
  decrementLabel,
  incrementLabel,
  onDecrement,
  onIncrement,
  onChangeText,
}: LoadStepperProps) {
  return (
    <View style={[styles.card, error && styles.cardError]}>
      <View
        accessible={!onChangeText}
        accessibilityLabel={[label, value || placeholder, unit].filter(Boolean).join(' ')}
      >
        {/* With the font at 150 % «REPETICIONES» broke in two lines: it shrinks to fit (RNF-18). */}
        <Text style={[typography.label, styles.label]} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
        <View style={styles.value}>
          {onChangeText ? (
            // iOS sizes a TextInput by its previous value: right after «5», «10» showed «1» (#220).
            // A hidden Text with the same value gives the width in the same render.
            <View>
              <Text
                style={[typography.numberHero, styles.sizer]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {value || placeholder}
              </Text>
              <TextInput
                accessibilityLabel={label}
                value={value}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                onChangeText={onChangeText}
                keyboardType="decimal-pad"
                style={[typography.numberHero, styles.input]}
              />
            </View>
          ) : (
            <Text
              style={[
                typography.numberHero,
                { color: value ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {value || placeholder}
            </Text>
          )}
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
  sizer: { minWidth: 48, opacity: 0 },
  input: {
    ...StyleSheet.absoluteFill,
    padding: 0,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  // At the bottom: side by side, load and reps keep their ± level whatever their notes (#195).
  plates: { flexDirection: 'row', gap: 10, marginTop: 'auto' },
});
