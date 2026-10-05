import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { colors, elevation, radius, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

/** Figma «Toast»: 5 s with a drain bar. */
const DURATION_MS = 5000;

interface SnackbarProps {
  message: string;
  action?: { label: string; onPress: () => void };
  onDismiss: () => void;
}

/**
 * Figma «Toast»: a light floating notice over the bottom block, with an optional action
 * ("Deshacer"). It dismisses itself; the screen decides where it sits.
 */
export function Snackbar({ message, action, onDismiss }: SnackbarProps) {
  const reduceMotion = useReduceMotion();
  const [drain] = useState(() => new Animated.Value(1));

  // The latest callback, so a parent that re-renders (a running clock, for example) with a new
  // inline function does not restart the 5 s.
  const latestOnDismiss = useRef(onDismiss);
  useEffect(() => {
    latestOnDismiss.current = onDismiss;
  });

  useEffect(() => {
    const timer = setTimeout(() => latestOnDismiss.current(), DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.timing(drain, {
      toValue: 0,
      duration: DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [drain, reduceMotion]);

  return (
    <View style={styles.toast}>
      <Text
        style={[typography.buttonDefault, styles.message]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        {message}
      </Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => {
            action.onPress();
            onDismiss();
          }}
          style={styles.action}
        >
          <Text style={[typography.bodyMBold, { color: colors.textPrimary }]}>{action.label}</Text>
        </Pressable>
      )}
      <Animated.View
        style={[styles.drain, { transform: [{ scaleX: drain }] }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgInverse,
    ...elevation.toast,
  },
  message: { flex: 1, color: colors.textOnInverse },
  action: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.textOnInverse,
  },
  // Shrinks from the left edge, like the Figma "Drenaje" bar.
  drain: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    transformOrigin: 'left',
    backgroundColor: colors.textOnInverse,
  },
});
