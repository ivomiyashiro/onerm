import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { SyncStatus } from '@/domain/models/sync-status';
import { SyncStatusCard } from '@/presentation/components/feedback/sync-status-card';
import { colors } from '@/presentation/theme';

jest.useFakeTimers();

const hidden = { includeHiddenElements: true };

// Figma «SyncStatus» (one variant per state of RF-SYNC-06): icon, icon color and background.
const CASES: [SyncStatus, string, string, string][] = [
  [{ kind: 'synced', lastSyncedAt: new Date(0) }, 'cloud-ok', colors.textOk, colors.bgCard],
  [{ kind: 'syncing' }, 'refresh', colors.textSecondary, colors.bgCard],
  [{ kind: 'pending', count: 3, online: false }, 'wifi-off', colors.textWarn, colors.bgWarnSoft],
  [{ kind: 'pending', count: 3, online: true }, 'refresh', colors.textSecondary, colors.bgCard],
  [{ kind: 'conflict', count: 2 }, 'alert', colors.textErr, colors.bgErrSoft],
  [{ kind: 'networkError' }, 'cloud-off', colors.textErr, colors.bgErrSoft],
  [{ kind: 'sessionExpired' }, 'lock', colors.textWarn, colors.bgWarnSoft],
  [{ kind: 'guest' }, 'cloud-off', colors.textSecondary, colors.bgCard],
  [{ kind: 'appOutdated' }, 'alert', colors.textWarn, colors.bgWarnSoft],
  [{ kind: 'workoutInProgress' }, 'clock', colors.textSecondary, colors.bgCard],
];

describe('SyncStatusCard', () => {
  it.each(CASES)('%o uses %s in its color over its background', async (status, icon, color, bg) => {
    await render(<SyncStatusCard status={status} message="Mensaje" />);

    expect(screen.getByTestId(`sync-icon-${icon}`, hidden).props.color).toBe(color);
    expect(StyleSheet.flatten(screen.getByTestId('sync-status').props.style)).toMatchObject({
      backgroundColor: bg,
    });
  });

  it('shows the message and runs the action', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <SyncStatusCard
        status={{ kind: 'networkError' }}
        message="No pudimos respaldar. Lo intentamos de nuevo solos."
        action={{ label: 'Reintentar', onPress }}
      />,
    );

    expect(
      screen.getByText('No pudimos respaldar. Lo intentamos de nuevo solos.'),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a short action such as «Ver» is still a 48 × 48 dp target (RNF-16)', async () => {
    await render(
      <SyncStatusCard
        status={{ kind: 'conflict', count: 2 }}
        message="2 cambios no se pudieron respaldar"
        action={{ label: 'Ver', onPress: jest.fn() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Ver' })).toHaveStyle({
      minHeight: 48,
      minWidth: 48,
    });
  });
});
