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
import { Text } from '@/presentation/components/text';
import { HeroPhoto } from '@/presentation/features/home/hero-photo';
import { trendCounts, trendOf, type Trend } from '@/presentation/features/home/trend';
import { useHomeViewModel, type HomeState } from '@/presentation/features/home/use-home-view-model';
import { ElapsedText } from '@/presentation/components/clock/elapsed-text';
import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import {
  ENTRANCE_STEP_MS,
  EntranceStep,
  useEntrance,
} from '@/presentation/components/motion/entrance';
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

/** Figma HeroCard: a day name up to this length goes at 46, longer ones at 34 (#225). */
const SHORT_DAY_NAME = 6;

/**
 * S07 · Inicio: the next day of the active routine (RN-RUT-01) with the suggestion of each
 * exercise (RF-SUG-01), the first exercise and the week (RF-ENT-01.AC8).
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

/** The entrance (#225, like S12): the card, then «Lo de hoy». */
const ENTRANCE = { card: 0, today: 150 } as const;
const ENTRANCE_TOTAL_MS = ENTRANCE.today + ENTRANCE_STEP_MS;

/**
 * Figma «S07 · Dirección A · El número es el héroe» (#225): «Hoy toca» over the photo of its kind
 * of day, with the first exercise's suggestion as the hero number and the week so far
 * (RF-ENT-01.AC8); then «Lo de hoy» with a badge of what changes and the main exercise lit.
 */
function NextDay({
  nextDay,
  inProgressSince,
  onChangeDay,
}: {
  nextDay: NextDayContent;
  inProgressSince: Date | null;
  onChangeDay: () => void;
}) {
  const animate = !useReduceMotion();
  const progress = useEntrance(animate, ENTRANCE_TOTAL_MS);
  const { routine, day, minutes, unit, week } = nextDay;
  const trends = day.exercises.map((e) => trendOf(e.suggestion.reason.code));
  const { up, reps } = trendCounts(trends);
  const summary = [up > 0 && home.goesUpIn(up), reps > 0 && home.addsRepsIn(reps)]
    .filter(Boolean)
    .join(' · ');
  // «Día A»: the last word in lime.
  const split = day.name.lastIndexOf(' ');
  const head = split === -1 ? '' : day.name.slice(0, split + 1);
  const tail = day.name.slice(split + 1);
  const first = day.exercises[0];
  return (
    <>
      <EntranceStep progress={progress} at={ENTRANCE.card} totalMs={ENTRANCE_TOTAL_MS}>
        <View style={styles.hero}>
          <HeroPhoto kind={nextDay.dayKind} />
          {inProgressSince ? (
            // #229: only this line renders every second, not the card.
            <ElapsedText
              startedAt={inProgressSince}
              format={home.inProgressSince}
              style={[typography.label, { color: colors.textAccent }]}
            />
          ) : (
            <Text style={[typography.label, { color: colors.textAccent }]}>{home.todayIs}</Text>
          )}
          <Text
            style={[
              day.name.length <= SHORT_DAY_NAME ? typography.displayL : typography.displayM,
              styles.dayName,
            ]}
            numberOfLines={2}
            accessibilityRole="header"
          >
            {head}
            <Text style={{ color: colors.textAccent }}>{tail}</Text>
          </Text>
          <Text style={[typography.bodyM, { color: colors.textOnPhotoMuted }]}>
            {home.meta(routine.name, day.exercises.length, minutes)}
          </Text>
          {first !== undefined && <FirstExercise exercise={first} trend={trends[0]} unit={unit} />}
          <Week done={week.done} goal={week.goal} />
          <View style={styles.changeDay}>
            <Button variant="secondary" label={home.changeDay} onPress={onChangeDay} />
          </View>
        </View>
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
          <View style={styles.rows}>
            {day.exercises.map(({ id, name, suggestion, prescription }, index) => (
              <TodayRow
                key={id}
                name={name ?? catalog.detail.unavailable}
                trend={trends[index]}
                main={prescription.role === 'main'}
                loadKg={suggestion.loadKg}
                reps={suggestion.reps}
                unit={unit}
              />
            ))}
          </View>
        </View>
      </EntranceStep>
    </>
  );
}

type NextDayExercise = NextDayContent['day']['exercises'][number];

/**
 * RF-ENT-01.AC8: «Empezás con 90 kg × 10», the number as the hero (marca §1). Calibrating, only
 * its name: the calibration is explained inside the exercise (#196).
 */
function FirstExercise({
  exercise,
  trend,
  unit,
}: {
  exercise: NextDayExercise;
  trend: Trend;
  unit: LoadUnit;
}) {
  const { loadKg, reps } = exercise.suggestion;
  const name = exercise.name ?? catalog.detail.unavailable;
  return (
    <View style={styles.first}>
      <Text style={[typography.label, { color: colors.textOnPhotoMuted }]}>{home.startsWith}</Text>
      {trend === 'calibrate' ? (
        <Text style={[typography.titleL, { color: colors.textPrimary }]}>{name}</Text>
      ) : (
        <>
          <View style={styles.value}>
            {loadKg !== null && (
              <>
                <Text style={[typography.numberHero, styles.number]}>
                  {loadNumber(toUnit(loadKg, unit), unit)}
                </Text>
                <Text style={[typography.titleM, { color: colors.textOnPhotoMuted }]}>
                  {common.units[unit]}
                </Text>
              </>
            )}
            <Text style={[typography.numberL, styles.number]}>{home.timesReps(reps)}</Text>
          </View>
          <Text style={[typography.bodyS, { color: colors.textOnPhotoMuted }]}>{name}</Text>
        </>
      )}
    </View>
  );
}

/** One dot per day of the week at most: the count says the rest. */
const MAX_DOTS = 7;

/** RF-ENT-01.AC8: «Esta semana ●●○ 2 de 3», a dot per day of the goal (more if it was passed). */
function Week({ done, goal }: { done: number; goal: number }) {
  return (
    <View accessible accessibilityLabel={home.weekName(done, goal)} style={styles.week}>
      <Text style={[typography.label, { color: colors.textOnPhotoMuted }]}>{home.thisWeek}</Text>
      <View style={styles.dots}>
        {Array.from({ length: Math.min(Math.max(done, goal), MAX_DOTS) }, (_, index) => (
          <View key={index} style={[styles.dot, index < done && styles.dotDone]} />
        ))}
      </View>
      <Text style={[typography.bodyMBold, { color: colors.textPrimary }]}>
        {home.weekProgress(done, goal)}
      </Text>
    </View>
  );
}

const BADGES: Record<Exclude<Trend, 'calibrate'>, { text: string; color: string; bg: string }> = {
  up: { text: home.badges.up, color: colors.textAccent, bg: colors.bgAccentSoft },
  reps: { text: home.badges.reps, color: colors.textOk, bg: colors.bgOkSoft },
  same: { text: home.badges.same, color: colors.textSecondary, bg: colors.bgRaised },
  deload: { text: home.badges.deload, color: colors.textWarn, bg: colors.bgWarnSoft },
};

/**
 * Figma «ExerciseRow» (#225): a badge of what changes, the exercise and the suggestion
 * (RF-SUG-01.AC1), the main exercise lit. Calibrating, no badge nor suggestion (#196).
 */
function TodayRow({
  name,
  trend,
  main,
  loadKg,
  reps,
  unit,
}: {
  name: string;
  trend: Trend;
  main: boolean;
  loadKg: number | null;
  reps: number;
  unit: LoadUnit;
}) {
  const badge = trend === 'calibrate' ? null : BADGES[trend];
  const label =
    badge === null ? (main ? home.main : null) : main ? home.mainBadge(badge.text) : badge.text;
  const number = main ? typography.numberMl : typography.numberMs;
  return (
    <View style={[styles.row, main && styles.rowMain]}>
      <View style={styles.rowTexts}>
        {label !== null && (
          <View style={[styles.badge, { backgroundColor: badge?.bg ?? colors.bgRaised }]}>
            <Text style={[typography.tab, { color: badge?.color ?? colors.textSecondary }]}>
              {label}
            </Text>
          </View>
        )}
        <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>{name}</Text>
      </View>
      {trend !== 'calibrate' && (
        <View style={styles.value}>
          {loadKg !== null && (
            <>
              <Text style={[number, styles.number]}>{loadNumber(toUnit(loadKg, unit), unit)}</Text>
              <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                {common.units[unit]}
              </Text>
            </>
          )}
          <Text style={[number, styles.number]}>{home.timesReps(reps)}</Text>
        </View>
      )}
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
  first: { gap: 2, paddingTop: space.s8 },
  week: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingTop: space.s8 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textOnPhotoMuted,
  },
  dotDone: { borderColor: colors.bgAccent, backgroundColor: colors.bgAccent },
  section: { gap: space.s10 },
  rows: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    minHeight: size.targetMain,
    paddingVertical: space.s12,
    paddingLeft: space.s16,
    paddingRight: space.s14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  rowMain: { borderColor: colors.borderAccentSoft },
  rowTexts: { flex: 1, alignItems: 'flex-start', gap: space.s4 },
  badge: { paddingVertical: 2, paddingHorizontal: space.s8, borderRadius: radius.full },
  number: { color: colors.textPrimary },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  changeDay: { alignSelf: 'flex-start', paddingTop: space.s10 },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
});
