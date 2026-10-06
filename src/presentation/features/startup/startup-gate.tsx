import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { StartupErrorScreen } from '@/presentation/features/startup/startup-error-screen';
import { useStartupViewModel } from '@/presentation/features/startup/use-startup-view-model';
import { colors } from '@/presentation/theme';

/**
 * Mounts the app only once the local database is ready (07 §6, 08 §3). While the migrations run
 * it shows the bare background, which they take milliseconds; if one fails, the error screen.
 */
export function StartupGate({ children }: { children: ReactNode }) {
  const { state, actions } = useStartupViewModel();

  switch (state.status) {
    case 'ready':
      return children;
    case 'error':
      return <StartupErrorScreen onRetry={actions.retry} />;
    case 'preparing':
      return <View style={styles.preparing} />;
  }
}

const styles = StyleSheet.create({
  preparing: { flex: 1, backgroundColor: colors.bgBase },
});
