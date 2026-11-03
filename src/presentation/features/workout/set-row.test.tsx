import { render, screen } from '@testing-library/react-native';

import { aBilateralSet } from '@/domain/testing/builders';
import { SetRow } from '@/presentation/features/workout/set-row';
import type { SetRowView } from '@/presentation/features/workout/use-workout-view-model';

async function renderRow(row: SetRowView) {
  await render(
    <SetRow row={row} unit="kg" effortMode="simple" onPress={() => {}} onEffort={() => {}} />,
  );
}

const done = (overrides: Parameters<typeof aBilateralSet>[0] = {}): SetRowView => ({
  kind: 'done',
  number: 1,
  set: aBilateralSet({ loadKg: 60, reps: 8, rir: 1, ...overrides }),
  askEffort: false,
  missingEffort: false,
});

describe('SetRow (RNF-18)', () => {
  it('a done set says which one it is and that it is done', async () => {
    await renderRow(done());

    expect(
      screen.getByRole('button', { name: 'Serie 1, hecha, 60 kg, × 8, 1 más' }),
    ).toBeOnTheScreen();
  });

  it('a done warm-up says so instead of «C»', async () => {
    await renderRow(done({ isWarmup: true }));

    expect(screen.getByRole('button', { name: /^Calentamiento, hecha, 60 kg/ })).toBeOnTheScreen();
  });

  it('the current set reads its number and values, and how to adjust it', async () => {
    await renderRow({ kind: 'current', number: 2, values: { loadKg: 5, reps: 8 }, extra: false });

    expect(screen.getByRole('button', { name: 'Serie 2, 5 kg, × 8' })).toHaveProp(
      'accessibilityHint',
      'Tocá para ajustar',
    );
  });
});
