import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Text } from '@/presentation/components/text';
import { decimal, shortDate } from '@/presentation/strings/numbers';
import { colors, typography } from '@/presentation/theme';

/** A point of the S20 chart, already in the unit shown. */
export interface ChartPoint {
  at: Date;
  value: number;
  /** RN-SUG-07: an approximate e1RM is drawn hollow. */
  hollow: boolean;
  /** The record: the lime point. */
  record: boolean;
}

const HEIGHT = 140;
/** Room for the y labels on the left and for the points at the edges. */
const LEFT = 36;
const PAD = 8;
const RADIUS = 5;
/** With many points (a long «Todo») they would overlap: smaller dots. */
const DENSE_POINTS = 40;
const DENSE_RADIUS = 2.5;

/**
 * Figma «S20 · Progreso de ejercicio»: a line through the points (RN-PROG-02: only with 2 or more),
 * three horizontal guides with their values, and the first and last date below. Drawn with
 * react-native-svg, already in the app for the icons: no chart library (#39).
 */
export function ProgressChart({ points, label }: { points: readonly ChartPoint[]; label: string }) {
  const [width, setWidth] = useState(0);
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A single value (or a flat line) gets a band around it, so it sits in the middle.
  const spread = max - min || Math.max(1, max * 0.1);
  const low = Math.floor(max === min ? min - spread / 2 : min);
  const high = Math.ceil(max === min ? max + spread / 2 : max);
  const ticks = [high, Math.round((high + low) / 2), low];

  const plotWidth = Math.max(0, width - LEFT - PAD * 2);
  const x = (index: number) =>
    LEFT + PAD + (points.length === 1 ? plotWidth / 2 : (index * plotWidth) / (points.length - 1));
  const y = (value: number) => PAD + ((high - value) / (high - low || 1)) * (HEIGHT - PAD * 2);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {ticks.map((tick, i) => (
            <Line
              key={i}
              x1={LEFT}
              x2={width}
              y1={y(tick)}
              y2={y(tick)}
              stroke={colors.borderHair}
              strokeWidth={1}
            />
          ))}
          {points.length >= 2 && (
            <Polyline
              points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
              fill="none"
              stroke={colors.textPrimary}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          )}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(p.value)}
              r={points.length > DENSE_POINTS ? DENSE_RADIUS : RADIUS}
              strokeWidth={2}
              stroke={p.record ? colors.bgAccent : colors.textPrimary}
              fill={p.record ? colors.bgAccent : p.hollow ? colors.bgCard : colors.textPrimary}
            />
          ))}
        </Svg>
      )}
      {width > 0 &&
        ticks.map((tick, i) => (
          <Text
            key={i}
            style={[typography.monoS, styles.tick, { top: y(tick) - 8 }]}
            importantForAccessibility="no"
          >
            {decimal(tick)}
          </Text>
        ))}
      <View style={[styles.dates, points.length === 1 && styles.datesSingle]}>
        <Text style={[typography.monoS, { color: colors.textSecondary }]}>
          {shortDate(points[0].at)}
        </Text>
        {points.length > 1 && (
          <Text style={[typography.monoS, { color: colors.textSecondary }]}>
            {shortDate(points[points.length - 1].at)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tick: { position: 'absolute', left: 0, color: colors.textSecondary },
  dates: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: LEFT },
  datesSingle: { justifyContent: 'center' },
});
