import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/presentation/components/brand/logo';
import { Button } from '@/presentation/components/button/button';
import { Notice } from '@/presentation/components/feedback/notice';
import { backupNoticeText } from '@/presentation/shared/sync-status-text';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { Text } from '@/presentation/components/text';
import { NextDay } from '@/presentation/features/home/next-day';
import { useHomeViewModel } from '@/presentation/features/home/use-home-view-model';
import { home } from '@/presentation/strings/home';
import { profile } from '@/presentation/strings/profile';
import { colors, fonts, space } from '@/presentation/theme';

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
});
