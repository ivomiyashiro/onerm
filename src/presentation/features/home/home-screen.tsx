import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/presentation/components/brand/logo';
import type { LoadUnit } from '@/domain/models/vocabulary';
import { toUnit } from '@/domain/rules/units';
import { Button } from '@/presentation/components/button/button';
import { Notice } from '@/presentation/components/feedback/notice';
import { backupNoticeText } from '@/presentation/features/profile/sync-status-text';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { deltaOf, trendCounts, trendOf, type Delta } from '@/presentation/features/home/trend';
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
import { CardPlate } from '@/presentation/components/button/card-plate';
import { colors, fonts, radius, size, space, typography } from '@/presentation/theme';

interface HomeScreenProps {
  /** «Elegir una rutina»: the templates (S13). */
  onChooseRoutine: () => void;
  onCreateRoutine: () => void;
  /** «Cambiar día»: S08. */
  onChangeDay: () => void;
  /** «Empezar» or «Continuar» in the card: S09 (RF-ENT-01.AC1). */
  onOpenWorkout: () => void;
}

const SKELETON_ROWS = 4;

/**
 * S07 · Inicio (Figma «S07 · Tarjeta sin foto · 1 Placa lima», #225): the next day of the active
 * routine (RN-RUT-01) on the brand's lime plate with «Empezar», the week day by day, and each
 * exercise with its suggestion (RF-SUG-01) and what changes (RF-ENT-01.AC8).
 */
export function HomeScreen({
  onChooseRoutine,
  onCreateRoutine,
  onChangeDay,
  onOpenWorkout,
}: HomeScreenProps) {
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
            // RF-ENT-01.AC1, AC4: start the day, or go back to the one in progress.
            onStart={async () => {
              if (await actions.start()) onOpenWorkout();
            }}
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

/** The entrance (#225, like S12): the card, the week, then «Lo de hoy». */
const ENTRANCE = { card: 0, week: 100, today: 200 } as const;
const ENTRANCE_TOTAL_MS = ENTRANCE.today + ENTRANCE_STEP_MS;

function NextDay({
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

/** RF-ENT-01.AC9: the day's size drops with its length; two lines at most, then «…». */
function dayStyle(name: string) {
  const length = Array.from(name).length;
  return length <= 6
    ? typography.displayHero
    : length <= 12
      ? typography.displayL
      : typography.displayM;
}

/**
 * The lime plate (marca §18): «Hoy toca» and «Cambiar día», the day big over its letter, the
 * routine, what it takes and «Empezar» («Continuar» with a workout in progress, RF-ENT-01.AC4).
 */
function DayCard({
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
  const { routine, day, sets, minutes } = nextDay;
  const words = day.name.trim().split(/\s+/);
  const letter = Array.from(words[words.length - 1])[0]?.toUpperCase() ?? '';
  const facts: [IconName, string][] = [
    ['clock', home.minutes(minutes)],
    ['list', home.exercises(day.exercises.length)],
    ['dumbbell', home.sets(sets)],
  ];
  return (
    <View style={styles.card}>
      <CardPlate />
      <Text style={styles.letter} accessible={false} importantForAccessibility="no">
        {letter}
      </Text>
      <View style={styles.cardTop}>
        <View style={styles.chip}>
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
        </View>
        <Pressable accessibilityRole="button" onPress={onChangeDay} style={styles.changeDay}>
          <Text style={[typography.bodyMBold, { color: colors.textOnAccent }]}>
            {home.changeDay}
          </Text>
          <Icon name="chevron" size={16} color={colors.textOnAccent} />
        </Pressable>
      </View>
      <Text
        style={[dayStyle(day.name), { color: colors.textOnAccent }]}
        numberOfLines={2}
        ellipsizeMode="tail"
        accessibilityRole="header"
      >
        {day.name}
      </Text>
      <Text style={[typography.bodyM, { color: colors.textOnAccent }]}>{routine.name}</Text>
      <View style={styles.facts}>
        {facts.map(([icon, label]) => (
          <View key={icon} style={styles.fact}>
            <Icon name={icon} size={16} color={colors.textOnAccent} />
            <Text style={[typography.tab, { color: colors.textOnAccent }]}>{label}</Text>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={onStart} style={styles.start}>
        <Text style={[typography.titleM, styles.startLabel]}>
          {inProgressSince ? home.continue : home.startDay(day.name)}
        </Text>
        <Icon name="arrow" size={20} color={colors.textAccent} />
      </Pressable>
    </View>
  );
}

/** RF-ENT-01.AC8: «Esta semana · 2 de 3» and Monday to Sunday, the days done and today lit. */
function Week({
  done,
  goal,
  doneDays,
  today,
}: {
  done: number;
  goal: number;
  doneDays: readonly number[];
  today: number;
}) {
  return (
    <View style={styles.week} accessible accessibilityLabel={home.weekName(done, goal)}>
      <View style={styles.weekTitle}>
        <Text style={[typography.label, { color: colors.textSecondary }]}>{home.thisWeek}</Text>
        <Text style={[typography.bodyMBold, { color: colors.textPrimary }]}>
          {home.weekProgress(done, goal)}
        </Text>
      </View>
      <View style={styles.weekDays}>
        {home.weekDayLetters.map((letter, index) => {
          const state = doneDays.includes(index) ? 'done' : index === today ? 'today' : 'pending';
          return (
            <View
              key={index}
              accessibilityLabel={home.weekDay(index, state)}
              style={[styles.weekDay, styles[state]]}
            >
              <Text
                style={[
                  typography.tab,
                  {
                    color:
                      state === 'done'
                        ? colors.textOnAccent
                        : state === 'today'
                          ? colors.textAccent
                          : colors.textSecondary,
                  },
                ]}
              >
                {letter}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const DELTA_COLORS: Record<Delta['tone'], { color: string; bg: string }> = {
  up: { color: colors.textAccent, bg: colors.bgAccentSoft },
  down: { color: colors.textWarn, bg: colors.bgWarnSoft },
  reps: { color: colors.textOk, bg: colors.bgOkSoft },
  same: { color: colors.textSecondary, bg: colors.bgRaised },
};

/**
 * Figma «ExerciseRow» (#225): its number, the exercise with «Principal», its muscle and
 * prescription, and the suggestion (RF-SUG-01.AC1) with what changes; nothing to calibrate (#196).
 */
function TodayRow({
  exercise,
  index,
  unit,
}: {
  exercise: NextDayContent['day']['exercises'][number];
  index: number;
  unit: LoadUnit;
}) {
  const { name, muscle, prescription, suggestion } = exercise;
  const main = prescription.role === 'main';
  const trend = trendOf(suggestion.reason.code);
  const delta = deltaOf(suggestion, unit);
  const detail = home.exerciseDetail(
    main,
    muscle === null ? null : catalog.muscles[muscle],
    prescription.sets,
    prescription.repRange.min,
    prescription.repRange.max,
  );
  const value =
    trend === 'calibrate'
      ? null
      : `${suggestion.loadKg === null ? '' : `${loadNumber(toUnit(suggestion.loadKg, unit), unit)} ${common.units[unit]} `}${home.timesReps(suggestion.reps)}`;
  const label = name ?? catalog.detail.unavailable;
  return (
    <View
      accessible
      accessibilityLabel={[label, detail, value, delta?.text].filter(Boolean).join(', ')}
      style={[styles.row, index > 0 && styles.rowDivider]}
    >
      <View style={[styles.index, main && styles.indexMain]}>
        <Text
          style={[typography.numberS, { color: main ? colors.textAccent : colors.textSecondary }]}
        >
          {String(index + 1).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.rowTexts}>
        <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
      {value !== null && (
        <View style={styles.suggestion}>
          <View style={styles.value}>
            {suggestion.loadKg !== null && (
              <>
                <Text style={[typography.numberSm, { color: colors.textPrimary }]}>
                  {loadNumber(toUnit(suggestion.loadKg, unit), unit)}
                </Text>
                <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                  {common.units[unit]}
                </Text>
              </>
            )}
            <Text style={[typography.numberSm, { color: colors.textPrimary }]}>
              {home.timesReps(suggestion.reps)}
            </Text>
          </View>
          {delta !== null && (
            <View style={[styles.delta, { backgroundColor: DELTA_COLORS[delta.tone].bg }]}>
              <Text style={[typography.tab, { color: DELTA_COLORS[delta.tone].color }]}>
                {delta.text}
              </Text>
            </View>
          )}
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
  card: {
    gap: space.s8,
    padding: 18,
    // The primary button's plate (#225): its radius and cut corners, at card size.
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  // The day's letter, huge and tone on tone (marca §18).
  letter: {
    position: 'absolute',
    right: -24,
    bottom: -40,
    fontFamily: fonts.display,
    fontSize: 280,
    lineHeight: 280,
    color: colors.textOnAccent,
    opacity: 0.08,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    paddingVertical: space.s6,
    paddingHorizontal: space.s12,
    borderRadius: radius.full,
    backgroundColor: colors.bgBase,
  },
  changeDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: size.targetMin,
    paddingLeft: space.s8,
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16, paddingTop: space.s4 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s10,
    minHeight: size.targetMain,
    marginTop: space.s8,
    borderRadius: 16,
    backgroundColor: colors.bgBase,
  },
  startLabel: { color: colors.textAccent, textTransform: 'uppercase' },
  week: {
    gap: space.s12,
    padding: space.s16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  weekTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  done: { backgroundColor: colors.bgAccent },
  today: { borderWidth: 1.5, borderColor: colors.bgAccent },
  pending: { backgroundColor: colors.bgRaised },
  section: { gap: space.s10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  list: {
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
    paddingVertical: space.s14,
    paddingHorizontal: space.s16,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  index: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.bgRaised,
  },
  indexMain: { backgroundColor: colors.bgAccentSoft },
  rowTexts: { flex: 1, gap: 2 },
  suggestion: { alignItems: 'flex-end', gap: space.s4 },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  delta: { paddingVertical: 2, paddingHorizontal: space.s6, borderRadius: radius.full },
});
