import { render, screen, userEvent } from '@testing-library/react-native';

import { RouterTabBar } from '@/presentation/components/navigation/router-tab-bar';
import type { TabItem } from '@/presentation/components/navigation/tab-bar';

jest.useFakeTimers();

const TABS: TabItem[] = [
  { key: 'index', label: 'Inicio', icon: 'home' },
  { key: 'routines', label: 'Rutinas', icon: 'list' },
];

function fakeNavigation(defaultPrevented = false) {
  return {
    emit: jest.fn(() => ({ defaultPrevented })),
    navigate: jest.fn(),
  };
}

const state = {
  index: 0,
  routes: [
    { key: 'index-1', name: 'index' },
    { key: 'routines-1', name: 'routines' },
  ],
};

describe('RouterTabBar', () => {
  it('emits tabPress and then navigates, as React Navigation tab bars do', async () => {
    const user = userEvent.setup();
    const navigation = fakeNavigation();
    await render(
      <RouterTabBar tabs={TABS} state={state} navigation={navigation} bottomInset={0} />,
    );

    await user.press(screen.getByRole('tab', { name: 'Rutinas' }));

    expect(navigation.emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'routines-1',
      canPreventDefault: true,
    });
    expect(navigation.navigate).toHaveBeenCalledWith('routines');
  });

  it('does not navigate when a screen prevents the press or the tab is already active', async () => {
    const user = userEvent.setup();
    const prevented = fakeNavigation(true);
    await render(<RouterTabBar tabs={TABS} state={state} navigation={prevented} bottomInset={0} />);

    await user.press(screen.getByRole('tab', { name: 'Rutinas' }));
    await user.press(screen.getByRole('tab', { name: 'Inicio' }));

    expect(prevented.emit).toHaveBeenCalledTimes(2);
    expect(prevented.navigate).not.toHaveBeenCalled();
  });
});
