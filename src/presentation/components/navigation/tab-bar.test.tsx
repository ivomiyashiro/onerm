import { render, screen, userEvent } from '@testing-library/react-native';

import { TabBar, type TabItem } from '@/presentation/components/navigation/tab-bar';
import { colors } from '@/presentation/theme';

jest.useFakeTimers();

const TABS: TabItem[] = [
  { key: 'index', label: 'Inicio', icon: 'home' },
  { key: 'routines', label: 'Rutinas', icon: 'list' },
  { key: 'progress', label: 'Progreso', icon: 'chart' },
  { key: 'profile', label: 'Perfil', icon: 'user' },
];

describe('TabBar', () => {
  it('shows the 4 tabs and marks the active one', async () => {
    await render(<TabBar tabs={TABS} activeKey="routines" onSelect={jest.fn()} />);

    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Rutinas' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Inicio' })).not.toBeSelected();
    expect(screen.getByText('Rutinas')).toHaveStyle({ color: colors.textPrimary });
    expect(screen.getByText('Inicio')).toHaveStyle({ color: colors.textSecondary });
  });

  it('each tab is at least 56 dp tall (RNF-16)', async () => {
    await render(<TabBar tabs={TABS} activeKey="index" onSelect={jest.fn()} />);

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveStyle({ minHeight: 56 });
    }
  });

  it('reports the pressed tab', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    await render(<TabBar tabs={TABS} activeKey="index" onSelect={onSelect} />);

    await user.press(screen.getByRole('tab', { name: 'Progreso' }));

    expect(onSelect).toHaveBeenCalledWith('progress');
  });

  it('the central action goes between the tabs and can be disabled (marca §15)', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    const { rerender } = await render(
      <TabBar
        tabs={TABS}
        action={{
          kind: 'continue',
          label: 'Continuar',
          accessibilityLabel: (time) => `Continuar entrenamiento, ${time}`,
          // #229: the disc runs its own clock from the start.
          startedAt: new Date(Date.now() - (18 * 60 + 42) * 1000),
          onPress,
        }}
        activeKey="index"
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText('18:42')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Continuar entrenamiento, 18:42' }));
    expect(onPress).toHaveBeenCalled();

    await rerender(
      <TabBar
        tabs={TABS}
        action={{
          kind: 'disabled',
          label: 'Empezar',
          accessibilityLabel: () => 'Empezar, no disponible',
          onPress,
        }}
        activeKey="index"
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Empezar, no disponible' })).toBeDisabled();
  });
});
