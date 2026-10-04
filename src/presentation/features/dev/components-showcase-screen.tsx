import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SyncStatus } from '@/domain/models/sync-status';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SkeletonCard, SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { Snackbar } from '@/presentation/components/feedback/snackbar';
import { SyncStatusCard } from '@/presentation/components/feedback/sync-status-card';
import { TextField } from '@/presentation/components/input/text-field';
import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { LoadStepper } from '@/presentation/components/stepper/load-stepper';
import { strings } from '@/presentation/strings';
import { devShowcase as t } from '@/presentation/strings/dev-showcase';
import { colors, typography } from '@/presentation/theme';

const noop = () => {};

const { sync } = strings.profile;
const SYNC_SAMPLES: { status: SyncStatus; message: string; action?: string }[] = [
  {
    status: { kind: 'synced', lastSyncedAt: new Date(0) },
    message: sync.synced('2 min'),
    action: sync.backUpNow,
  },
  { status: { kind: 'syncing' }, message: sync.syncing },
  { status: { kind: 'pending', count: 3, online: false }, message: sync.pendingOffline(3) },
  {
    status: { kind: 'pending', count: 3, online: true },
    message: sync.pendingOnline(3),
    action: sync.backUpNow,
  },
  { status: { kind: 'workoutInProgress' }, message: sync.workoutInProgress },
  {
    status: { kind: 'sessionExpired' },
    message: sync.sessionExpired,
    action: sync.signInAgain,
  },
  { status: { kind: 'conflict', count: 2 }, message: sync.conflict(2), action: sync.see },
  { status: { kind: 'networkError' }, message: sync.networkError, action: sync.retry },
  { status: { kind: 'guest' }, message: sync.guest, action: sync.createAccount },
  { status: { kind: 'appOutdated' }, message: sync.appOutdated },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[typography.label, { color: colors.textSecondary }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Development only (#19): every base component, to compare with Figma on the emulator. */
export function ComponentsShowcaseScreen() {
  const [email, setEmail] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const closeSheet = () => setSheetOpen(false);
  const closeDialog = () => setDialogOpen(false);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.displayM, { color: colors.textPrimary }]}>{t.title}</Text>

        <Section title={t.sections.buttons}>
          <Button variant="primary" label={t.buttons.start} icon="arrow" onPress={noop} />
          <Button variant="primary" size="xl" label={t.buttons.done} onPress={noop} />
          <Button variant="primary" label={t.buttons.start} disabled onPress={noop} />
          <Button
            variant="primary"
            label={t.buttons.done}
            loading
            loadingLabel={t.buttons.saving}
            onPress={noop}
          />
          <Button variant="secondary" label={t.buttons.seeAll} onPress={noop} />
          <Button variant="secondary" label={t.buttons.seeAll} disabled onPress={noop} />
          <View style={styles.row}>
            <Button variant="tertiary" label={t.buttons.skip} onPress={noop} />
            <Button variant="danger" label={t.buttons.deleteSet} onPress={noop} />
          </View>
          <Button variant="dangerSolid" label={t.buttons.discard} onPress={noop} />
        </Section>

        <Section title={t.sections.steppers}>
          <View style={styles.row}>
            <LoadStepper
              label={t.stepper.load}
              value="62,5"
              unit={t.stepper.unit}
              note={t.stepper.loadNote}
              decrementLabel={t.stepper.decreaseLoad}
              incrementLabel={t.stepper.increaseLoad}
              onDecrement={noop}
              onIncrement={noop}
            />
            <LoadStepper
              label={t.stepper.reps}
              value="0"
              note={t.stepper.repsError}
              error
              decrementLabel={t.stepper.decreaseReps}
              incrementLabel={t.stepper.increaseReps}
              onDecrement={noop}
              onIncrement={noop}
            />
          </View>
        </Section>

        <Section title={t.sections.fields}>
          <TextField
            label={t.field.label}
            value={email}
            onChangeText={setEmail}
            placeholder={t.field.placeholder}
            help={t.field.help}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextField
            label={t.field.label}
            value="ivo@correo"
            onChangeText={noop}
            error={t.field.error}
          />
        </Section>

        <Section title={t.sections.feedback}>
          <EmptyState
            icon="search"
            title={t.empty.title}
            body={t.empty.body}
            action={{ label: t.empty.action, onPress: noop }}
          />
          <SkeletonCard testID="showcase-skeleton-card" />
          <SkeletonRow />
        </Section>

        <Section title={t.sections.sync}>
          {SYNC_SAMPLES.map(({ status, message, action }) => (
            <SyncStatusCard
              key={message}
              status={status}
              message={message}
              action={action ? { label: action, onPress: noop } : undefined}
            />
          ))}
        </Section>

        <Section title={t.sections.overlays}>
          <Button
            variant="secondary"
            label={t.overlays.openSheet}
            onPress={() => setSheetOpen(true)}
          />
          <Button
            variant="secondary"
            label={t.overlays.openDialog}
            onPress={() => setDialogOpen(true)}
          />
          <Button
            variant="secondary"
            label={t.overlays.showSnackbar}
            onPress={() => setSnackbarOpen(true)}
          />
        </Section>
      </ScrollView>

      {snackbarOpen && (
        <View style={styles.snackbar}>
          <Snackbar
            message={strings.workout.setDeleted.message}
            action={{ label: strings.workout.setDeleted.undo, onPress: noop }}
            onDismiss={() => setSnackbarOpen(false)}
          />
        </View>
      )}

      <BottomSheet
        visible={sheetOpen}
        title={t.overlays.sheetTitle}
        subtitle={t.overlays.sheetSubtitle}
        closeLabel={t.overlays.close}
        onClose={closeSheet}
      >
        <MenuItem
          icon="swap"
          label={strings.workout.exerciseMenu.substitute}
          onPress={closeSheet}
        />
        <MenuItem icon="skip" label={strings.workout.exerciseMenu.skip} onPress={closeSheet} />
        <MenuItem icon="plus" label={strings.workout.exerciseMenu.addSet} onPress={closeSheet} />
      </BottomSheet>

      <Dialog
        visible={dialogOpen}
        title={strings.dialogs.D09.title}
        body={strings.dialogs.D09.body(9)}
        actions={[
          { label: strings.dialogs.D09.cancel, kind: 'safe', onPress: closeDialog },
          {
            label: strings.dialogs.D09.discardDestructive,
            kind: 'destructive',
            onPress: closeDialog,
          },
        ]}
        onDismiss={closeDialog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: 28, padding: 16, paddingTop: 56, paddingBottom: 48 },
  section: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  snackbar: { position: 'absolute', left: 16, right: 16, bottom: 32 },
});
