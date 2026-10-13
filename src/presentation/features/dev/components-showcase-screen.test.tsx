import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';

import { ComponentsShowcaseScreen } from '@/presentation/features/dev/components-showcase-screen';
import { strings } from '@/presentation/strings';
import { devShowcase as t } from '@/presentation/strings/dev-showcase';

// The sheet floats above the system bar, so it reads the safe area.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>
);

jest.useFakeTimers();

describe('ComponentsShowcaseScreen', () => {
  it('renders every base component', async () => {
    await render(<ComponentsShowcaseScreen />, { wrapper });

    expect(screen.getAllByRole('button', { name: t.buttons.start })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: t.buttons.seeAll })).toHaveLength(2);
    expect(screen.getByRole('button', { name: t.buttons.skip })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t.buttons.deleteSet })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t.buttons.discard })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t.stepper.increaseLoad })).toBeOnTheScreen();
    expect(screen.getAllByLabelText(t.field.label)).toHaveLength(2);
    expect(screen.getByText(t.empty.title)).toBeOnTheScreen();
    expect(
      screen.getByTestId('showcase-skeleton-card', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getAllByTestId('sync-status')).toHaveLength(10);
  });

  it('opens the bottom sheet, the dialog and the snackbar', async () => {
    const user = userEvent.setup();
    await render(<ComponentsShowcaseScreen />, { wrapper });

    await user.press(screen.getByRole('button', { name: t.overlays.openSheet }));
    expect(screen.getByRole('header', { name: t.overlays.sheetTitle })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: t.overlays.close }));

    await user.press(screen.getByRole('button', { name: t.overlays.openDialog }));
    expect(screen.getByRole('header', { name: strings.dialogs.D09.title })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: strings.dialogs.D09.cancel }));

    await user.press(screen.getByRole('button', { name: t.overlays.showSnackbar }));
    expect(screen.getByRole('alert')).toHaveAccessibleName(strings.workout.setDeleted.message);
  });
});
