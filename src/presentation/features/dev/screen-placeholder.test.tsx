import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';

import {
  ScreenPlaceholder,
  SheetPlaceholder,
} from '@/presentation/features/dev/screen-placeholder';
import { dev } from '@/presentation/strings/dev';

// The sheet floats above the system bar, so it reads the safe area.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>
);

jest.useFakeTimers();

describe('ScreenPlaceholder', () => {
  it('shows the screen id and name', async () => {
    await render(<ScreenPlaceholder id="S13" />);

    expect(screen.getByRole('header', { name: dev.screens.S13 })).toBeOnTheScreen();
    expect(screen.getByText('S13')).toBeOnTheScreen();
  });

  it('can show extra content, such as the development entry', async () => {
    await render(<ScreenPlaceholder id="S21" footer={<ScreenPlaceholder id="S22" />} />);

    expect(screen.getByText(dev.screens.S22)).toBeOnTheScreen();
  });
});

describe('SheetPlaceholder', () => {
  it('is a sheet named after the screen that closes with ×', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<SheetPlaceholder id="S08" onClose={onClose} />, { wrapper });

    expect(screen.getByRole('header', { name: dev.screens.S08 })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: dev.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
