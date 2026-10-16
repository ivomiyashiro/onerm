import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RejectedChange } from '@/domain/models/rejected-change';
import { ObserveRejectedChanges } from '@/domain/usecases/rejected-changes';
import { RejectedChangesScreen } from '@/presentation/features/sync/rejected-changes-screen';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { profile } from '@/presentation/strings/profile';
import { rejectedChangesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const ROUTINE: RejectedChange = {
  kind: 'routine',
  id: 'r1',
  reason: '23514',
  name: 'Fuerza',
  uploadedBefore: false,
  dependents: 2,
};

async function renderScreen(useCases: UseCases) {
  const onBack = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <RejectedChangesScreen onBack={onBack} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { onBack };
}

describe('RejectedChangesScreen (S25)', () => {
  it('content: each rejected change by the record it is about', async () => {
    await renderScreen(someUseCases(rejectedChangesOver([ROUTINE])));

    expect(screen.getByText(profile.conflicts.body)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Rutina «Fuerza»' })).toBeOnTheScreen();
  });

  it('empty: «Todo respaldado»', async () => {
    await renderScreen(someUseCases(rejectedChangesOver([])));

    expect(screen.getByText(profile.conflicts.empty.title)).toBeOnTheScreen();
  });

  it('error: a failed read says so', async () => {
    await renderScreen(
      someUseCases({
        observeRejectedChanges: new ObserveRejectedChanges({
          observe: (observer) => (observer.error(new Error('read')), () => {}),
        }),
      }),
    );

    expect(screen.getByText(profile.conflicts.readError.title)).toBeOnTheScreen();
  });

  it('RF-SYNC-06.AC4: D12 shows the reason and what discarding does, and discards it', async () => {
    const rejected = rejectedChangesOver([ROUTINE]);
    await renderScreen(someUseCases(rejected));

    await userEvent.press(screen.getByRole('button', { name: 'Rutina «Fuerza»' }));

    expect(screen.getByText(dialogs.D12.title)).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Algún dato está fuera de los valores que acepta el servidor. Si lo descartás, se borra junto con 2 registros que dependen de él.',
      ),
    ).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: dialogs.D12.discardDestructive }));
    expect(rejected.calls.discarded).toEqual(['r1']);
  });

  it('without connection, D12 says discarding needs it', async () => {
    const uploaded = { ...ROUTINE, uploadedBefore: true };
    await renderScreen(someUseCases(rejectedChangesOver([uploaded], 'offline')));

    await userEvent.press(screen.getByRole('button', { name: 'Rutina «Fuerza»' }));
    await userEvent.press(screen.getByRole('button', { name: dialogs.D12.discardDestructive }));

    expect(screen.getByText(new RegExp(profile.conflicts.discardOffline))).toBeOnTheScreen();
  });

  it('«Reintentar» retries it', async () => {
    const rejected = rejectedChangesOver([ROUTINE]);
    await renderScreen(someUseCases(rejected));

    await userEvent.press(screen.getByRole('button', { name: 'Rutina «Fuerza»' }));
    await userEvent.press(screen.getByRole('button', { name: dialogs.D12.retry }));

    expect(rejected.calls.retried).toEqual(['r1']);
  });

  it('back goes back', async () => {
    const { onBack } = await renderScreen(someUseCases(rejectedChangesOver([])));

    await userEvent.press(screen.getByRole('button', { name: common.back }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
