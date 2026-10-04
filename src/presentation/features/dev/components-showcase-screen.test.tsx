import { render, screen, userEvent } from '@testing-library/react-native';

import { ComponentsShowcaseScreen } from '@/presentation/features/dev/components-showcase-screen';
import { devShowcase as t } from '@/presentation/strings/dev-showcase';

jest.useFakeTimers();

describe('ComponentsShowcaseScreen', () => {
  it('renders every base component', async () => {
    await render(<ComponentsShowcaseScreen />);

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
    await render(<ComponentsShowcaseScreen />);

    await user.press(screen.getByRole('button', { name: t.overlays.openSheet }));
    expect(screen.getByRole('header', { name: t.overlays.sheetTitle })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: t.overlays.close }));

    await user.press(screen.getByRole('button', { name: t.overlays.openDialog }));
    expect(screen.getByRole('header', { name: t.overlays.dialogTitle })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: t.overlays.cancel }));

    await user.press(screen.getByRole('button', { name: t.overlays.showSnackbar }));
    expect(screen.getByRole('alert')).toHaveAccessibleName(t.overlays.setDeleted);
  });
});
