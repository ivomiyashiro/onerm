import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { colors } from '@/presentation/theme';
import { spring } from '@/presentation/theme/motion';

interface RestRingProps {
  size: number;
  strokeWidth: number;
  /** What is left, from 1 (just started) to 0 (done). */
  progress: number;
  /** The rest ended: a full ring in teal (Figma «Descanso terminado»). */
  finished?: boolean;
  children?: ReactNode;
}

/** Figma «Anillo»: the track and the part of the rest still left, clockwise from the top. */
export function RestRing({
  size,
  strokeWidth,
  progress,
  finished = false,
  children,
}: RestRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // A rest of 0 s gives 0/0: an empty ring.
  const left = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const center = size / 2;
  const { pulse, halo } = useFinishPulse(finished);

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ scale: pulse }] }}>
      {/* The halo is the ring's own stroke: the circle's stroke spans the outer `strokeWidth` of the box. */}
      {finished && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              borderWidth: strokeWidth,
              borderRadius: size / 2,
              opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
              transform: [
                { scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.32] }) },
              ],
            },
          ]}
        />
      )}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={finished ? colors.textOk : colors.borderControl}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {!finished && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.bgAccent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - left)}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </Svg>
      <Animated.View style={styles.center}>{children}</Animated.View>
    </Animated.View>
  );
}

/** How long the halo takes to spread and fade out. */
const HALO_MS = 850;

/**
 * #248 M3: when the rest ends on screen, the ring pulses once (1 → 1.05 → 1) and a halo spreads
 * from it and fades out. Not when it was already over on opening, nor with «reduce motion».
 */
function useFinishPulse(finished: boolean) {
  const reduce = useReduceMotion();
  const [pulse] = useState(() => new Animated.Value(1));
  const [halo] = useState(() => new Animated.Value(1));
  const was = useRef(finished);

  useLayoutEffect(() => {
    const ended = finished && !was.current;
    was.current = finished;
    if (!ended || reduce) return;
    halo.setValue(0);
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(pulse, { toValue: 1, ...spring, useNativeDriver: true }),
      ]),
      Animated.timing(halo, {
        toValue: 1,
        duration: HALO_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => {
      animation.stop();
      pulse.setValue(1);
      halo.setValue(1);
    };
  }, [finished, reduce, pulse, halo]);

  return { pulse, halo };
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  halo: { ...StyleSheet.absoluteFill, borderColor: colors.textOk },
});
