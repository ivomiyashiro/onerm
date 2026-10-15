import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { InMemoryAccountRepository } from '@/domain/testing/in-memory-repositories';
import { AnswerAccountNudge, ReadAccountNudge } from '@/domain/usecases/account-nudge';
import { useAccountNudgeViewModel } from '@/presentation/features/summary/use-account-nudge-view-model';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const NOW = new Date('2026-10-15T12:00:00Z');

async function setup(enabled = true, account = new InMemoryAccountRepository()) {
  const onCreateAccount = jest.fn();
  const useCases = someUseCases({
    readAccountNudge: new ReadAccountNudge(account, () => NOW),
    answerAccountNudge: new AnswerAccountNudge(account, () => NOW),
  });
  const hook = await renderHook(() => useAccountNudgeViewModel(enabled, onCreateAccount), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
    ),
  });
  return { ...hook, account, onCreateAccount };
}

describe('useAccountNudgeViewModel (D13, RF-AUTH-01.AC5)', () => {
  it('AC5: a guest who finished a workout sees it', async () => {
    const { result } = await setup();

    expect(result.current.visible).toBe(true);
  });

  it('waits for the summary: nothing is read while disabled', async () => {
    const { result } = await setup(false);

    expect(result.current.visible).toBe(false);
  });

  it('AC5: «Ahora no» closes it and records the answer', async () => {
    const { result, account, onCreateAccount } = await setup();

    await act(() => result.current.actions.notNow());

    expect(result.current.visible).toBe(false);
    expect(account.lastNudgeAt).toEqual(NOW);
    expect(onCreateAccount).not.toHaveBeenCalled();
  });

  it('«Crear cuenta» records the answer and opens the sign-up', async () => {
    const { result, account, onCreateAccount } = await setup();

    await act(() => result.current.actions.createAccount());

    expect(account.lastNudgeAt).toEqual(NOW);
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });

  it('AC6: it is not shown again within 7 days', async () => {
    const account = new InMemoryAccountRepository();
    account.lastNudgeAt = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);

    const { result } = await setup(true, account);

    expect(result.current.visible).toBe(false);
  });
});
