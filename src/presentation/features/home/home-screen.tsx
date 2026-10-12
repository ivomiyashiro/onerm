import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/presentation/components/brand/logo';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { Text } from '@/presentation/components/text';
import { useHomeViewModel, type HomeState } from '@/presentation/features/home/use-home-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { home } from '@/presentation/strings/home';
import { profile } from '@/presentation/strings/profile';
import { routines } from '@/presentation/strings/routines';
import { colors, fonts, radius, size, space, typography } from '@/presentation/theme';

interface HomeScreenProps {
  /** «Elegir una rutina»: the templates (S13). */
  onChooseRoutine: () => void;
  onCreateRoutine: () => void;
}

const SKELETON_ROWS = 4;

/** Figma HeroCard: a day name up to this length goes at 72 (Short), longer ones at 46 (Long). */
const SHORT_DAY_NAME = 6;

/**
 * S07 · Inicio: the next day of the active routine (RN-RUT-01). The suggestions per exercise, the
 * week strip and «Cambiar día» come with the workout (#34, #35).
 */
export function HomeScreen({ onChooseRoutine, onCreateRoutine }: HomeScreenProps) {
  const { state, actions } = useHomeViewModel();
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
        {state.status === 'loading' &&
          Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <SkeletonRow key={i} testID="home-skeleton" />
          ))}
        {state.status === 'content' && <NextDay nextDay={state.nextDay} />}
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

/** Figma HeroCard «Hoy toca» (without the photo for now) and «Lo de hoy». */
function NextDay({ nextDay }: { nextDay: NextDayContent }) {
  const { routine, day, sets, minutes } = nextDay;
  // «Día A»: the last word in lime.
  const split = day.name.lastIndexOf(' ');
  const head = split === -1 ? '' : day.name.slice(0, split + 1);
  const tail = day.name.slice(split + 1);
  return (
    <>
      <View style={styles.hero}>
        <Text style={[typography.label, { color: colors.textPrimary }]}>{home.todayIs}</Text>
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
      </View>
      <View style={styles.section}>
        <Text style={[typography.titleM, { color: colors.textPrimary }]}>{home.todayList}</Text>
        <View style={styles.rows}>
          {day.exercises.map(({ id, name, prescription }, index) => (
            <View key={id} style={[styles.row, index > 0 && styles.rowDivider]}>
              <Text style={[typography.bodyRow, styles.rowName]}>
                {name ?? catalog.detail.unavailable}
              </Text>
              <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                {routines.template.setsByRange(
                  prescription.sets,
                  routines.repRange(prescription.repRange),
                )}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </>
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
    backgroundColor: colors.bgCard,
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
});
