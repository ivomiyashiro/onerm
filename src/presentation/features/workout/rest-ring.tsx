import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/presentation/theme';

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
  const left = Math.min(1, Math.max(0, progress));
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
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
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
