import { render, screen, userEvent } from '@testing-library/react-native';

import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { FinishGuestUnion, StartGuestUnion } from '@/domain/usecases/guest-union';
import { GuestUnionGate } from '@/presentation/features/auth/guest-union-gate';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { dialogs } from '@/presentation/strings/dialogs';
import { guestUnionOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function renderGate(overrides: Partial<ReturnType<typeof guestUnionOver>> = {}) {
  const account = new InMemoryAccountRepository();
  account.pendingMigration = 'u1';
  const gateway = new FakeAuthGateway(undefined, { userId: 'u1', email: 'ana@mail.com' });
  const union = guestUnionOver(
    account,
    gateway,
    { workouts: 3, routines: 1, workoutInProgress: true },
    true,
  );
  await render(
    <AppStoreProvider store={createAppStore()}>
      <UseCasesProvider useCases={someUseCases({ ...union, ...overrides })}>
        <GuestUnionGate />
      </UseCasesProvider>
    </AppStoreProvider>,
  );
  return { union, gateway };
}

/** A promise the test resolves when it wants, to see what shows while it waits. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('GuestUnionGate (D01, D01b)', () => {
  it('#285: while the account is checked, it says so before D01', async () => {
    const check = deferred<boolean>();
    await renderGate({
      startGuestUnion: new StartGuestUnion({
        guestSummary: async () => ({ workouts: 3, routines: 1, workoutInProgress: true }),
        accountHasData: () => check.promise,
        unite: async () => 'done',
      }),
    });

    expect(await screen.findByText(dialogs.D01.checking)).toBeOnTheScreen();
    expect(screen.queryByText(dialogs.D01.title)).not.toBeOnTheScreen();
  });

  it('#285: «Sumar a mi cuenta» shows that it is summing, and nothing can be pressed meanwhile', async () => {
    const unite = deferred<'done' | 'offline'>();
    await renderGate({ finishGuestUnion: new FinishGuestUnion({ unite: () => unite.promise }) });

    await userEvent.press(await screen.findByRole('button', { name: dialogs.D01.merge }));

    expect(screen.getByRole('button', { name: dialogs.D01.merging })).toBeDisabled();
    expect(screen.getByRole('button', { name: dialogs.D01.discard })).toBeDisabled();
    expect(screen.getByRole('button', { name: dialogs.D01.cancel })).toBeDisabled();
  });

  it('RF-AUTH-05.AC2: D01 says what the guest has and offers to sum it', async () => {
    const { union } = await renderGate();

    expect(
      await screen.findByText(
        'En este teléfono tenés 3 entrenamientos y 1 rutina. Podés sumarlos a tu cuenta o descartarlos.',
      ),
    ).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: dialogs.D01.merge }));

    expect(union.united).toEqual([{ userId: 'u1', keepGuestData: true }]);
  });

  it('RF-AUTH-05.AC4: «Descartar» shows D01b, with the workout in progress, before deleting', async () => {
    const { union } = await renderGate();

    await userEvent.press(await screen.findByRole('button', { name: dialogs.D01.discard }));

    expect(
      screen.getByText(
        'Se van a borrar de este teléfono 3 entrenamientos y 1 rutina, y el entrenamiento en curso. No se puede deshacer.',
      ),
    ).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: dialogs.D01b.discardDestructive }));
    expect(union.united).toEqual([{ userId: 'u1', keepGuestData: false }]);
  });

  it('RF-AUTH-05.AC9: «Cancelar» closes the session', async () => {
    const { gateway } = await renderGate();

    await userEvent.press(await screen.findByRole('button', { name: dialogs.D01.cancel }));

    expect(gateway.signedOut).toBe(1);
  });
});
