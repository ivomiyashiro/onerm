import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  EffortMode,
  ExperienceLevel,
  LoadUnit,
  TrainingGoal,
} from '@/domain/models/vocabulary';
import { Button } from '@/presentation/components/button/button';
import { NumberSegments } from '@/presentation/components/choice/number-segments';
import { OptionCard } from '@/presentation/components/choice/option-card';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SyncStatusCard } from '@/presentation/components/feedback/sync-status-card';
import { Icon } from '@/presentation/components/icons/icon';
import { SettingsGroup, SettingsRow } from '@/presentation/components/list/settings-row';
import { BottomSheet } from '@/presentation/components/overlay/bottom-sheet';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { Text } from '@/presentation/components/text';
import { RestNotificationsRow } from '@/presentation/features/profile/rest-notifications-row';
import {
  useProfileViewModel,
  type ProfileViewModel,
  type Setting,
  type SettingSheet,
} from '@/presentation/features/profile/use-profile-view-model';
import { auth } from '@/presentation/strings/auth';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { onboarding } from '@/presentation/strings/onboarding';
import { profile as text } from '@/presentation/strings/profile';
import { routines } from '@/presentation/strings/routines';
import { colors, space, typography } from '@/presentation/theme';

interface ProfileScreenProps {
  onSignUp: () => void;
  onSignIn: () => void;
  onAbout: () => void;
  /** RF-PERF-06: the increments and the bar weight. */
  onIncrements: () => void;
  /** Only in development builds: the screen list and the component gallery. */
  devEntry?: ReactNode;
}

const LEVELS: readonly ExperienceLevel[] = ['novice', 'intermediate', 'advanced'];
const GOALS: readonly TrainingGoal[] = ['health', 'hypertrophy', 'strength'];
const UNITS: readonly LoadUnit[] = ['kg', 'lb'];
const EFFORTS: readonly EffortMode[] = ['simple', 'rir'];
/** RF-PERF-03.AC3: only 2 to 6 can be chosen. */
const DAYS = [2, 3, 4, 5, 6];

const SHEET_TITLE: Record<Setting, string> = {
  level: text.sheets.level,
  goal: text.sheets.goal,
  days: text.sheets.daysPerWeek,
  unit: text.sheets.unit,
  effort: text.sheets.effort,
};

/** S21 · Perfil y ajustes (RF-PERF-03..05, the rest notifications of 08 §6). Sync and account arrive in F7 and F8. */
export function ProfileScreen({
  onSignUp,
  onSignIn,
  onAbout,
  onIncrements,
  devEntry,
}: ProfileScreenProps) {
  const { state, sheet, dialog, actions } = useProfileViewModel();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[typography.displayM, styles.title]} accessibilityRole="header">
          {text.title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.account}>
          <View style={styles.avatar}>
            <Icon name="user" size={22} color={colors.textPrimary} />
          </View>
          <View style={styles.accountText}>
            <Text style={[typography.titleM, { color: colors.textPrimary }]}>{text.guest}</Text>
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {text.noAccount}
            </Text>
          </View>
        </View>
        {/* RF-AUTH-01.AC4: the guest knows the data lives only on this phone. */}
        <SyncStatusCard
          status={{ kind: 'guest' }}
          message={text.sync.guest}
          action={{ label: text.sync.createAccount, onPress: onSignUp }}
        />
        {state.status === 'content' && (
          <Settings
            values={{
              level: routines.levels[state.profile.level],
              goal: text.values.goal[state.profile.goal],
              days: String(state.profile.daysPerWeek),
              unit: text.values.unit[state.profile.unit],
              effort: text.values.effort[state.profile.effortMode],
            }}
            onOpen={actions.open}
            onIncrements={onIncrements}
          />
        )}
        {state.status === 'error' && (
          <EmptyState
            icon="alert"
            title={text.readError.title}
            body={text.readError.body}
            action={{ label: text.readError.retry, onPress: actions.retry }}
          />
        )}
        <SettingsGroup>
          <SettingsRow label={text.rows.about} onPress={onAbout} />
        </SettingsGroup>
        <View style={styles.accountActions}>
          <Button variant="secondary" label={text.sync.createAccount} onPress={onSignUp} />
          <Button variant="tertiary" label={auth.welcome.signIn} onPress={onSignIn} />
          {devEntry}
        </View>
      </ScrollView>
      {sheet && <Sheet sheet={sheet} actions={actions} />}
      <Dialog
        visible={dialog !== null}
        title={dialogs.D06.title}
        body={
          dialog === null
            ? undefined
            : 'goal' in dialog
              ? dialogs.D06.body(routines.goals[dialog.goal])
              : dialogs.D06.bodyLevel(text.values.levelInText[dialog.level])
        }
        actions={[
          { label: dialogs.D06.adjust, kind: 'advance', onPress: actions.adjust },
          { label: dialogs.D06.keep, kind: 'plain', onPress: actions.keep },
        ]}
        onDismiss={actions.keep}
      />
    </View>
  );
}

function Settings({
  values,
  onOpen,
  onIncrements,
}: {
  values: Record<Setting, string>;
  onOpen: (setting: Setting) => void;
  onIncrements: () => void;
}) {
  return (
    <>
      <Section label={text.sections.training}>
        <SettingsRow label={text.rows.level} value={values.level} onPress={() => onOpen('level')} />
        <SettingsRow
          label={text.rows.goal}
          value={values.goal}
          onPress={() => onOpen('goal')}
          divided
        />
        <SettingsRow
          label={text.rows.daysPerWeek}
          value={values.days}
          onPress={() => onOpen('days')}
          divided
        />
      </Section>
      <Section label={text.sections.preferences}>
        <SettingsRow label={text.rows.unit} value={values.unit} onPress={() => onOpen('unit')} />
        <SettingsRow
          label={text.rows.effort}
          value={values.effort}
          onPress={() => onOpen('effort')}
          divided
        />
        <SettingsRow
          label={text.rows.increments}
          value={text.rows.byEquipment}
          onPress={onIncrements}
          divided
        />
        <RestNotificationsRow />
      </Section>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[typography.label, styles.sectionLabel]}>{label}</Text>
      <SettingsGroup>{children}</SettingsGroup>
    </View>
  );
}

/** marca §14: one sheet per setting, saved with «Guardar». */
function Sheet({ sheet, actions }: { sheet: SettingSheet; actions: ProfileViewModel['actions'] }) {
  const { setting, draft } = sheet;
  return (
    <BottomSheet
      visible
      title={SHEET_TITLE[setting]}
      closeLabel={common.close}
      onClose={actions.close}
      footer={
        <Button variant="primary" size="xl" label={text.sheets.save} onPress={actions.save} />
      }
    >
      <View style={styles.sheetContent}>
        {setting === 'level' &&
          LEVELS.map((level) => (
            <OptionCard
              key={level}
              {...onboarding.level[level]}
              selected={draft.level === level}
              onPress={() => actions.choose({ level })}
            />
          ))}
        {setting === 'goal' &&
          GOALS.map((goal) => (
            <OptionCard
              key={goal}
              {...onboarding.goal[goal]}
              selected={draft.goal === goal}
              onPress={() => actions.choose({ goal })}
            />
          ))}
        {setting === 'days' && draft.daysPerWeek !== undefined && (
          <NumberSegments
            values={DAYS}
            selected={draft.daysPerWeek}
            onSelect={(daysPerWeek) => actions.choose({ daysPerWeek })}
            label={text.sheets.daysPerWeek}
          />
        )}
        {setting === 'unit' &&
          UNITS.map((unit) => (
            <OptionCard
              key={unit}
              {...text.sheets[unit]}
              selected={draft.unit === unit}
              onPress={() => actions.choose({ unit })}
            />
          ))}
        {setting === 'effort' &&
          EFFORTS.map((effortMode) => (
            <OptionCard
              key={effortMode}
              {...text.sheets[effortMode]}
              selected={draft.effortMode === effortMode}
              onPress={() => actions.choose({ effortMode })}
            />
          ))}
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{NOTE[setting]}</Text>
      </View>
    </BottomSheet>
  );
}

/** The line under each sheet's options (13 §10). */
const NOTE: Record<Setting, string> = {
  level: text.sheets.routineDoesNotChange,
  goal: text.sheets.routineDoesNotChange,
  days: onboarding.days.help,
  unit: text.sheets.unitNote,
  effort: text.sheets.effortKept,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  header: { minHeight: 56, justifyContent: 'center', paddingLeft: 20, paddingRight: space.s8 },
  title: { color: colors.textPrimary, textTransform: 'uppercase' },
  content: {
    gap: 18,
    paddingTop: space.s8,
    paddingHorizontal: space.s16,
    paddingBottom: space.s24,
  },
  account: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingLeft: space.s4 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaised,
  },
  accountText: { flex: 1, gap: 2 },
  section: { gap: space.s8 },
  sectionLabel: { paddingLeft: space.s4, color: colors.textSecondary },
  accountActions: { gap: space.s8 },
  sheetContent: { gap: space.s12, paddingBottom: space.s8 },
});
