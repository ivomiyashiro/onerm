import { useLayoutEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import type { LocalDate } from '@/domain/models/local-date';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { Icon } from '@/presentation/components/icons/icon';
import { BottomSheet } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import { useWeeklyVolumeViewModel } from '@/presentation/features/progress/use-weekly-volume-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { decimal, shortDate } from '@/presentation/strings/numbers';
import { principles } from '@/presentation/strings/principles';
import { progress } from '@/presentation/strings/progress';
import { colors, radius, size, space, typography } from '@/presentation/theme';

const text = progress.overview;
/** P-03: the reference line of the bars, and the floor of the guide range (8–12). */
const REFERENCE_SETS = 10;
const GUIDE_FLOOR = 8;
/** The bars fill up to this many sets, or to the week's highest value if it is more. */
const MIN_SCALE = 14;

/** #248 M6: each bar grows in this long, this long after the one above. */
const BAR_MS = 550;
const STAGGER_MS = 60;
const EASE_STEPS = [0, 0.15, 0.3, 0.5, 0.7, 1];

/**
 * #248 M6: the bars grow from the left one after the other when a week shows (on entering and
 * when another week's data arrives), while the guide stays still. One value drives them all; with «reduce
 * motion» they are full at once.
 */
function useBarsGrow(week: string | null, bars: number) {
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(1));
  const total = BAR_MS + STAGGER_MS * Math.max(0, bars - 1);

  useLayoutEffect(() => {
    if (week === null || reduce) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: total,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
      progress.setValue(1);
    };
  }, [week, reduce, total, progress]);

  return (index: number) => {
    const start = (index * STAGGER_MS) / total;
    const span = BAR_MS / total;
    // The native driver takes no easing in an interpolation: an ease-out in a few straight steps.
    return progress.interpolate({
      inputRange: EASE_STEPS.map((t) => start + t * span),
      outputRange: EASE_STEPS.map((t) => 1 - (1 - t) ** 3),
      extrapolate: 'clamp',
    });
  };
}

const dayOf = (date: LocalDate) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** S18 · Volumen (RF-PROG-06, Figma «S18 · Volumen semanal»): fractional sets per muscle. */
export function WeeklyVolumeView() {
  const { state, weeksAgo, actions } = useWeeklyVolumeViewModel();
  const [why, setWhy] = useState(false);
  // Keyed by the week shown, not by `weeksAgo`: its data comes a moment after the arrow.
  const shown = state.status === 'content' ? state.volume : null;
  const grow = useBarsGrow(shown?.weekStart ?? null, shown?.muscles.length ?? 0);

  if (state.status === 'loading') return <SkeletonRow testID="volume-skeleton" />;
  if (state.status === 'error') {
    return <EmptyState icon="alert" title={text.readError.title} body={text.readError.body} />;
  }
  const { volume } = state;
  const range = text.dateRange(
    shortDate(dayOf(volume.weekStart)),
    shortDate(dayOf(volume.weekEnd)),
  );
  const scale = Math.max(MIN_SCALE, ...volume.muscles.map((m) => m.sets));

  return (
    <View style={styles.view}>
      <View style={styles.week}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.previousWeek}
          onPress={actions.previousWeek}
          style={styles.arrow}
        >
          <Icon name="back" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.weekTitle}>
          <Text style={[typography.titleM, { color: colors.textPrimary }]}>
            {weeksAgo === 0 ? text.thisWeek : range}
          </Text>
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
            {weeksAgo === 0
              ? text.weekSubtitle(range, text.workoutsOfGoal(volume.workouts, volume.goal))
              : text.workoutsOfGoal(volume.workouts, volume.goal)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.nextWeek}
          accessibilityState={{ disabled: weeksAgo === 0 }}
          disabled={weeksAgo === 0}
          onPress={actions.nextWeek}
          style={[styles.arrow, weeksAgo === 0 && styles.disabled]}
        >
          <Icon name="chevron" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[typography.bodyMStrong, { color: colors.textPrimary }]}>
            {text.setsPerWeek}
          </Text>
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{text.guide}</Text>
        </View>
        {volume.muscles.map(({ muscle, sets }, index) => {
          const strong = sets >= GUIDE_FLOOR;
          return (
            <View
              key={muscle}
              style={styles.row}
              accessible
              accessibilityLabel={`${catalog.muscles[muscle]} ${decimal(sets)}`}
            >
              <Text style={[typography.bodyM, styles.muscle, { color: colors.textPrimary }]}>
                {catalog.muscles[muscle]}
              </Text>
              <View style={styles.track}>
                <Animated.View
                  style={[
                    styles.fill,
                    {
                      width: `${(sets / scale) * 100}%`,
                      backgroundColor: strong ? colors.textPrimary : colors.bgRaisedHover,
                      transform: [{ scaleX: grow(index) }],
                    },
                  ]}
                />
                <View style={[styles.reference, { left: `${(REFERENCE_SETS / scale) * 100}%` }]} />
              </View>
              <Text
                style={[
                  typography.numberS,
                  styles.value,
                  { color: strong ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {decimal(sets)}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{text.volumeHelp}</Text>
      <View style={styles.why}>
        <Button variant="tertiary" label={text.why10} onPress={() => setWhy(true)} />
      </View>
      <BottomSheet
        visible={why}
        title={text.why10}
        closeLabel={common.close}
        onClose={() => setWhy(false)}
      >
        <Text style={[typography.bodyL, { color: colors.textPrimary }]}>{principles['P-03']}</Text>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  view: { gap: space.s12 },
  week: { flexDirection: 'row', alignItems: 'center' },
  arrow: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
  weekTitle: { flex: 1, alignItems: 'center', gap: 2 },
  card: {
    gap: space.s12,
    padding: space.s16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: 32 },
  muscle: { width: 96 },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.bgRaised },
  // It grows from its left end (#248 M6).
  fill: { height: 10, borderRadius: 5, transformOrigin: 'left' },
  reference: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 18,
    borderRadius: 1,
    backgroundColor: colors.bgAccent,
  },
  value: { width: 40, textAlign: 'right' },
  why: { alignItems: 'flex-start' },
});
