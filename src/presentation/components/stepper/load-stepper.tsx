import { useLayoutEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, TextInput, View } from 'react-native';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { Plate } from '@/presentation/components/stepper/plate';
import { colors, radius, typography } from '@/presentation/theme';
import { motion } from '@/presentation/theme/motion';
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
  const roll = useRoll(value);
  const typed = onChangeText
    ? (text: string) => {
        // A typed value doesn't roll: only the ± do (#248 M2).
        roll.cancel();
        onChangeText(text);
      }
    : undefined;
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
          <View style={styles.number}>
            {roll.from !== null && (
              <Animated.View
                style={[styles.leaving, roll.leaving]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Text style={[typography.numberHero, { color: colors.textPrimary }]}>
                  {roll.from}
                </Text>
              </Animated.View>
            )}
            <Animated.View style={roll.coming}>
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
                    onChangeText={typed}
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
            </Animated.View>
          </View>
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
        <Plate
          sign="minus"
          accessibilityLabel={decrementLabel}
          onPress={() => {
            roll.start(-1);
            onDecrement();
          }}
        />
        <Plate
          sign="plus"
          accessibilityLabel={incrementLabel}
          onPress={() => {
            roll.start(1);
            onIncrement();
          }}
        />
      </View>
    </View>
  );
}

/** How far the values travel while they roll. */
const ROLL = 20;

/**
 * #248 M2: after a ±, the value rolls the way it changed: the old one leaves up and the new one
 * comes from below with +, the other way with −. Nothing rolls with «reduce motion», when the
 * value is typed or when the ± didn't change it (a limit).
 */
function useRoll(value: string) {
  const reduce = useReduceMotion();
  const [pressed, setPressed] = useState<{ from: string; direction: 1 | -1 } | null>(null);
  const [progress] = useState(() => new Animated.Value(1));
  const rolling = !reduce && pressed !== null && pressed.from !== value;

  useLayoutEffect(() => {
    if (!rolling) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.state,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setPressed(null);
    });
    return () => animation.stop();
  }, [rolling, value, progress]);

  const travel = (pressed?.direction ?? 1) * ROLL;
  return {
    from: rolling ? pressed.from : null,
    leaving: {
      opacity: progress.interpolate({
        inputRange: [0, 0.6],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -travel] }) },
      ],
    },
    coming: {
      opacity: progress,
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }) },
      ],
    },
    start: (direction: 1 | -1) => setPressed({ from: value, direction }),
    cancel: () => setPressed(null),
  };
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
  // The leaving value is centred over the coming one, whatever their widths.
  number: { alignItems: 'center' },
  leaving: { position: 'absolute', top: 0, left: -40, right: -40, alignItems: 'center' },
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
