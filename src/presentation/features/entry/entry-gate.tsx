import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Entry } from '@/domain/usecases/observe-entry';
import { useEntryViewModel } from '@/presentation/features/entry/use-entry-view-model';
import { LaunchReady } from '@/presentation/features/startup/launch-splash';
import { StartupErrorScreen } from '@/presentation/features/startup/startup-error-screen';
import { colors } from '@/presentation/theme';

/**
 * Renders the navigator for where the app opens (08 §3). The read is local and takes
 * milliseconds, so meanwhile it shows the bare background; if it fails, the startup error.
 */
export function EntryGate({ children }: { children: (entry: Entry) => ReactNode }) {
  const { state, actions } = useEntryViewModel();

  switch (state.status) {
    case 'ready':
      return (
        <>
          {/* The navigator is the app's first real screen: the launch splash leaves (marca §16). */}
          <LaunchReady />
          {children(state.entry)}
        </>
      );
    case 'error':
      return <StartupErrorScreen onRetry={actions.retry} />;
    case 'loading':
      return <View style={styles.loading} />;
  }
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bgBase },
});
