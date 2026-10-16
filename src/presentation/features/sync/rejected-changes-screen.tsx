import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SettingsGroup, SettingsRow } from '@/presentation/components/list/settings-row';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { Text } from '@/presentation/components/text';
import {
  rejectedChangeBody,
  rejectedChangeLabel,
} from '@/presentation/features/sync/rejected-change-text';
import { useRejectedChangesViewModel } from '@/presentation/features/sync/use-rejected-changes-view-model';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { profile } from '@/presentation/strings/profile';
import { colors, space, typography } from '@/presentation/theme';

const { conflicts } = profile;

interface RejectedChangesScreenProps {
  onBack: () => void;
}

/**
 * S25 · Cambios que no se pudieron respaldar (RF-SYNC-06.AC4): each change the server rejected,
 * and D12 to retry or discard it (RN-SYNC-11).
 */
export function RejectedChangesScreen({ onBack }: RejectedChangesScreenProps) {
  const { state, dialog, actions } = useRejectedChangesViewModel();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar title={conflicts.title} backLabel={common.back} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {state.status === 'content' && (
          <>
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {conflicts.body}
            </Text>
            <SettingsGroup>
              {state.changes.map((change, index) => (
                <SettingsRow
                  key={change.id}
                  label={rejectedChangeLabel(change)}
                  onPress={() => actions.open(change)}
                  divided={index > 0}
                />
              ))}
            </SettingsGroup>
          </>
        )}
        {state.status === 'empty' && (
          <EmptyState icon="cloud-ok" title={conflicts.empty.title} body={conflicts.empty.body} />
        )}
        {state.status === 'error' && (
          <EmptyState
            icon="alert"
            title={conflicts.readError.title}
            body={conflicts.readError.body}
          />
        )}
      </ScrollView>
      <Dialog
        visible={dialog !== null}
        title={dialogs.D12.title}
        body={
          dialog === null
            ? undefined
            : dialog.offline
              ? `${rejectedChangeBody(dialog.change)} ${conflicts.discardOffline}`
              : rejectedChangeBody(dialog.change)
        }
        actions={[
          { label: dialogs.D12.retry, kind: 'safe', onPress: () => void actions.retry() },
          {
            label: dialogs.D12.discardDestructive,
            kind: 'destructive',
            onPress: () => void actions.discard(),
          },
          { label: dialogs.D12.close, kind: 'plain', onPress: actions.close },
        ]}
        onDismiss={actions.close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: 18, paddingTop: 8, paddingHorizontal: space.s16 },
});
