import { useLayoutEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
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
  // Drawn again when other points show (another period), not when the same ones re-emit.
  const drawn = useDraw(
    width > 0 && points.length > 0
      ? `${width}:${points.length}:${points[0].at.getTime()}:${points[points.length - 1].at.getTime()}`
      : null,
  );
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
  // How far along the line each point is (0 to 1): it shows when the stroke gets to it.
  const along = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = x(i) - x(i - 1);
    const dy = y(points[i].value) - y(points[i - 1].value);
    along.push(along[i - 1] + Math.hypot(dx, dy));
  }
  const length = along[along.length - 1];
  const radius = points.length > DENSE_POINTS ? DENSE_RADIUS : RADIUS;

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
            <AnimatedPolyline
              points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
              fill="none"
              stroke={colors.textPrimary}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeDasharray={`${length} ${length}`}
              strokeDashoffset={drawn.interpolate({
                inputRange: [0, LINE_END],
                outputRange: [length, 0],
                easing: Easing.inOut(Easing.cubic),
                extrapolate: 'clamp',
              })}
            />
          )}
          {points.map((p, i) => (
            <AnimatedCircle
              key={i}
              cx={x(i)}
              cy={y(p.value)}
              r={pointRadius(drawn, length > 0 ? along[i] / length : 1, radius, p.record)}
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

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** #248 M5: the line draws in this long, and the record pops right after. */
const DRAW_MS = 1000;
const POP_MS = 400;
const LINE_END = DRAW_MS / (DRAW_MS + POP_MS);

/**
 * #248 M5: the progress of the chart's entrance, 0 to 1, run once per `signature`: the line
 * draws from left to right, each point shows when it gets there, and the record pops last. At 1
 * with «reduce motion».
 */
function useDraw(signature: string | null): Animated.Value {
  const reduce = useReduceMotion();
  const [drawn] = useState(() => new Animated.Value(1));

  useLayoutEffect(() => {
    if (signature === null || reduce) return;
    drawn.setValue(0);
    const animation = Animated.timing(drawn, {
      toValue: 1,
      duration: DRAW_MS + POP_MS,
      easing: Easing.linear,
      // SVG props: not on the native driver (like the check of #223).
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      drawn.setValue(1);
    };
  }, [signature, reduce, drawn]);

  return drawn;
}

/** A point grows in as the line reaches it (`at`, 0 to 1 along it); the record pops past full. */
function pointRadius(drawn: Animated.Value, at: number, radius: number, record: boolean) {
  const reached = at * LINE_END;
  if (record) {
    return drawn.interpolate({
      inputRange: [reached, reached + (1 - LINE_END) / 2, Math.max(1, reached + 0.01)],
      outputRange: [0, radius * 1.45, radius],
      extrapolate: 'clamp',
    });
  }
  return drawn.interpolate({
    inputRange: [reached, Math.min(1, reached + 0.12)],
    outputRange: [0, radius],
    easing: Easing.out(Easing.back(2)),
    extrapolate: 'clamp',
  });
}

const styles = StyleSheet.create({
  tick: { position: 'absolute', left: 0, color: colors.textSecondary },
  dates: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: LEFT },
  datesSingle: { justifyContent: 'center' },
});
