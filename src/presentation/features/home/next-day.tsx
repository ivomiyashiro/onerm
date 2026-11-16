import { StyleSheet, View } from 'react-native';

import { Text } from '@/presentation/components/text';
import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import {
  ENTRANCE_STEP_MS,
  EntranceStep,
  useEntrance,
} from '@/presentation/components/motion/entrance';
import { DayCard } from '@/presentation/features/home/day-card';
import type { HomeState } from '@/presentation/features/home/use-home-view-model';
import { TodayRow } from '@/presentation/features/home/today-row';
import { Week } from '@/presentation/features/home/week';
import { trendCounts, trendOf } from '@/presentation/shared/trend';
import { home } from '@/presentation/strings/home';
import { colors, radius, space, typography } from '@/presentation/theme';

export type NextDayContent = Extract<HomeState, { status: 'content' }>['nextDay'];

/** The entrance (#225, like S12): the card, the week, then «Lo de hoy». */
const ENTRANCE = { card: 0, week: 100, today: 200 } as const;
const ENTRANCE_TOTAL_MS = ENTRANCE.today + ENTRANCE_STEP_MS;

export function NextDay({
  nextDay,
  inProgressSince,
  onChangeDay,
  onStart,
}: {
  nextDay: NextDayContent;
  inProgressSince: Date | null;
  onChangeDay: () => void;
  onStart: () => void;
}) {
  const animate = !useReduceMotion();
  const progress = useEntrance(animate, ENTRANCE_TOTAL_MS);
  const { day, unit, week } = nextDay;
  const trends = day.exercises.map((e) => trendOf(e.suggestion.reason.code));
  const { up, reps } = trendCounts(trends);
  const summary = [up > 0 && home.goesUpIn(up), reps > 0 && home.addsRepsIn(reps)]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      <EntranceStep progress={progress} at={ENTRANCE.card} totalMs={ENTRANCE_TOTAL_MS}>
        <DayCard
          nextDay={nextDay}
          inProgressSince={inProgressSince}
          onChangeDay={onChangeDay}
          onStart={onStart}
        />
      </EntranceStep>
      <EntranceStep progress={progress} at={ENTRANCE.week} totalMs={ENTRANCE_TOTAL_MS}>
        <Week done={week.done} goal={week.goal} doneDays={week.doneDays} today={week.today} />
      </EntranceStep>
      <EntranceStep progress={progress} at={ENTRANCE.today} totalMs={ENTRANCE_TOTAL_MS}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.titleM, { color: colors.textPrimary }]}>{home.todayList}</Text>
            {summary !== '' && (
              <Text style={[typography.bodyS, { color: colors.textAccent }]}>
                {summary.charAt(0).toUpperCase() + summary.slice(1)}
              </Text>
            )}
          </View>
          <View style={styles.list}>
            {day.exercises.map((exercise, index) => (
              <TodayRow key={exercise.id} exercise={exercise} index={index} unit={unit} />
            ))}
          </View>
        </View>
      </EntranceStep>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.s10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  list: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
});
