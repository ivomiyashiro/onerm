import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AboutScreen } from '@/presentation/features/about/about-screen';
import { CREDITS } from '@/presentation/features/about/credits';
import { common } from '@/presentation/strings/common';
import { profile } from '@/presentation/strings/profile';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderScreen() {
  const onBack = jest.fn();
  const onOpenLink = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AboutScreen version="1.2.3" onBack={onBack} onOpenLink={onOpenLink} />
    </SafeAreaProvider>,
  );
  return { onBack, onOpenLink };
}

describe('AboutScreen (S22)', () => {
  it('shows the app version', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: profile.about.title })).toBeOnTheScreen();
    expect(screen.getByText(profile.about.version('1.2.3'))).toBeOnTheScreen();
  });

  it('RF-CAT-05.AC1: shows every source with its license', async () => {
    await renderScreen();

    expect(screen.getByText(profile.about.credits)).toBeOnTheScreen();
    for (const credit of CREDITS) {
      expect(screen.getByText(credit.title)).toBeOnTheScreen();
      expect(screen.getByText(credit.detail)).toBeOnTheScreen();
    }
  });

  it('RF-CAT-05.AC1: each source is a link', async () => {
    const user = userEvent.setup();
    const { onOpenLink } = await renderScreen();
    const [credit] = CREDITS;

    await user.press(screen.getByRole('link', { name: new RegExp(credit.title) }));

    expect(onOpenLink).toHaveBeenCalledWith(credit.url);
  });

  it('every credit links to an https page', () => {
    for (const credit of CREDITS) {
      expect(credit.url).toMatch(/^https:\/\//);
    }
  });

  it('the back button goes back', async () => {
    const user = userEvent.setup();
    const { onBack } = await renderScreen();

    await user.press(screen.getByRole('button', { name: common.back }));

    expect(onBack).toHaveBeenCalled();
  });
});
