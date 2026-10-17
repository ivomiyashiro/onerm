import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/presentation/components/brand/logo';
import type { LoadUnit } from '@/domain/models/vocabulary';
import { toUnit } from '@/domain/rules/units';
import { Button } from '@/presentation/components/button/button';
import { Notice } from '@/presentation/components/feedback/notice';
import { backupNoticeText } from '@/presentation/features/profile/sync-status-text';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { HeroPhoto } from '@/presentation/features/home/hero-photo';
import { TREND_ICONS, trendCounts, trendOf, type Trend } from '@/presentation/features/home/trend';
import { useHomeViewModel, type HomeState } from '@/presentation/features/home/use-home-view-model';
import { useElapsed } from '@/presentation/features/workout/use-elapsed';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { home } from '@/presentation/strings/home';
import { loadNumber } from '@/presentation/strings/numbers';
import { profile } from '@/presentation/strings/profile';
import { colors, fonts, radius, size, space, typography } from '@/presentation/theme';

interface HomeScreenProps {
  /** «Elegir una rutina»: the templates (S13). */
  onChooseRoutine: () => void;
  onCreateRoutine: () => void;
  /** «Cambiar día»: S08. */
  onChangeDay: () => void;
}

const SKELETON_ROWS = 4;

/** Figma HeroCard: a day name up to this length goes at 72 (Short), longer ones at 46 (Long). */
const SHORT_DAY_NAME = 6;

/**
 * S07 · Inicio: the next day of the active routine (RN-RUT-01) with the suggestion of each
 * exercise (RF-SUG-01). The week strip waits for its AC (marca §8, «pendiente de especificar»).
 */
export function HomeScreen({ onChooseRoutine, onCreateRoutine, onChangeDay }: HomeScreenProps) {
  const { state, inProgressSince, backupNotice, actions } = useHomeViewModel();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Logo size={36} />
        <Text style={styles.wordmark}>
          {profile.about.appName.one}
          <Text style={{ color: colors.textAccent }}>{profile.about.appName.rm}</Text>
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {backupNotice !== null && (
          <Notice
            message={backupNoticeText(backupNotice)}
            tone={backupNotice.kind === 'pending' ? 'info' : 'warn'}
          />
        )}
        {state.status === 'loading' &&
          Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <SkeletonRow key={i} testID="home-skeleton" />
          ))}
        {state.status === 'content' && (
          <NextDay
            nextDay={state.nextDay}
            inProgressSince={inProgressSince}
            onChangeDay={onChangeDay}
          />
        )}
        {state.status === 'empty' && (
          <>
            <EmptyState icon="list" title={home.noRoutine.title} body={home.noRoutine.body} />
            <Button
              variant="primary"
              label={home.noRoutine.chooseRoutine}
              icon="arrow"
              onPress={onChooseRoutine}
            />
            <Button
              variant="tertiary"
              label={home.noRoutine.createRoutine}
              onPress={onCreateRoutine}
            />
          </>
        )}
        {state.status === 'error' && (
          <EmptyState
            icon="alert"
            title={home.readError.title}
            body={home.readError.body}
            action={{ label: home.readError.retry, onPress: actions.retry }}
          />
        )}
      </ScrollView>
    </View>
  );
}

type NextDayContent = Extract<HomeState, { status: 'content' }>['nextDay'];

/** Figma HeroCard «Hoy toca», with the photo of its kind of day, and «Lo de hoy». */
function NextDay({
  nextDay,
  inProgressSince,
  onChangeDay,
}: {
  nextDay: NextDayContent;
  inProgressSince: Date | null;
  onChangeDay: () => void;
}) {
  const { routine, day, sets, minutes, unit } = nextDay;
  const time = useElapsed(inProgressSince);
  const trends = day.exercises.map((e) => trendOf(e.suggestion.reason.code));
  const { up, reps } = trendCounts(trends);
  const summary = [up > 0 && home.goesUpIn(up), reps > 0 && home.addsRepsIn(reps)]
    .filter(Boolean)
    .join(' · ');
  // «Día A»: the last word in lime.
  const split = day.name.lastIndexOf(' ');
  const head = split === -1 ? '' : day.name.slice(0, split + 1);
  const tail = day.name.slice(split + 1);
  return (
    <>
      <View style={styles.hero}>
        <HeroPhoto kind={nextDay.dayKind} />
        <Text style={[typography.label, { color: time ? colors.textAccent : colors.textPrimary }]}>
          {time ? home.inProgressSince(time) : home.todayIs}
        </Text>
        <Text
          style={[
            day.name.length <= SHORT_DAY_NAME ? typography.displayXl : typography.displayL,
            styles.dayName,
          ]}
          numberOfLines={2}
          accessibilityRole="header"
        >
          {head}
          <Text style={{ color: colors.textAccent }}>{tail}</Text>
        </Text>
        <Text style={[typography.bodyM, { color: colors.textOnPhotoMuted }]}>{routine.name}</Text>
        <View style={styles.stats}>
          <Stat
            value={String(day.exercises.length)}
            label={home.stats.exercises(day.exercises.length)}
          />
          <Stat value={String(sets)} label={home.stats.sets(sets)} divided />
          <Stat value={home.stats.approxMinutes(minutes)} label={home.stats.minutes} divided />
        </View>
        <View style={styles.changeDay}>
          <Button variant="secondary" label={home.changeDay} onPress={onChangeDay} />
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.titleM, { color: colors.textPrimary }]}>{home.todayList}</Text>
          {summary !== '' && (
            <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
              {summary.charAt(0).toUpperCase() + summary.slice(1)}
            </Text>
          )}
        </View>
        <View style={styles.rows}>
          {day.exercises.map(({ id, name, suggestion }, index) => (
            <TodayRow
              key={id}
              name={name ?? catalog.detail.unavailable}
              trend={trends[index]}
              loadKg={suggestion.loadKg}
              reps={suggestion.reps}
              unit={unit}
              divided={index > 0}
            />
          ))}
        </View>
      </View>
    </>
  );
}

/**
 * Figma «ExerciseRow»: what changes, the exercise and the suggestion (RF-SUG-01.AC1). The reason
 * lives in S09 and S10 (marca §8).
 */
function TodayRow({
  name,
  trend,
  loadKg,
  reps,
  unit,
  divided,
}: {
  name: string;
  trend: Trend;
  loadKg: number | null;
  reps: number;
  unit: LoadUnit;
  divided: boolean;
}) {
  return (
    <View style={[styles.row, divided && styles.rowDivider]}>
      <View style={styles.trend}>
        <Icon
          name={TREND_ICONS[trend]}
          size={15}
          color={trend === 'up' ? colors.textAccent : colors.textPrimary}
        />
      </View>
      <Text style={[typography.bodyRow, styles.rowName]}>{name}</Text>
      {/* Calibrating: only its icon; the calibration is explained inside the exercise (#196). */}
      {trend !== 'calibrate' && (
        <View style={styles.value}>
          {loadKg !== null && (
            <>
              <Text style={[typography.numberMs, { color: colors.textPrimary }]}>
                {loadNumber(toUnit(loadKg, unit), unit)}
              </Text>
              <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                {common.units[unit]}
              </Text>
            </>
          )}
          <Text style={[typography.numberMs, { color: colors.textPrimary }]}>
            {home.timesReps(reps)}
          </Text>
        </View>
      )}
    </View>
  );
}

function Stat({
  value,
  label,
  divided = false,
}: {
  value: string;
  label: string;
  divided?: boolean;
}) {
  return (
    <View style={[styles.stat, divided && styles.statDivided]}>
      <Text style={[typography.numberM, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[typography.tab, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    minHeight: 60,
    paddingLeft: space.s20,
    paddingRight: space.s8,
  },
  // Figma «Logo/Completo»: the wordmark in mixed case, like S22.
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 26,
    letterSpacing: -0.26,
    color: colors.textPrimary,
  },
  content: {
    gap: space.s16,
    paddingTop: space.s8,
    paddingHorizontal: space.s16,
    paddingBottom: space.s24,
  },
  hero: {
    gap: space.s6,
    minHeight: 250,
    justifyContent: 'flex-end',
    paddingTop: space.s16,
    paddingBottom: space.s14,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgBase,
    overflow: 'hidden',
  },
  dayName: { color: colors.textPrimary, textTransform: 'uppercase' },
  stats: { flexDirection: 'row', paddingTop: space.s4 },
  stat: { gap: space.s2, paddingRight: space.s16 },
  statDivided: {
    paddingLeft: space.s16,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderHair,
  },
  section: { gap: space.s10 },
  rows: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    minHeight: size.targetMain,
    paddingLeft: space.s16,
    paddingRight: space.s14,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  rowName: { flex: 1, color: colors.textPrimary },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  changeDay: { alignSelf: 'flex-start', paddingTop: space.s10 },
  trend: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.bgRaised,
  },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
});
