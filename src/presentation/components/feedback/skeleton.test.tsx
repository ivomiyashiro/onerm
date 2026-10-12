import { render, screen } from '@testing-library/react-native';

import { SkeletonCard, SkeletonRow } from '@/presentation/components/feedback/skeleton';

const hidden = { includeHiddenElements: true };

describe('Skeleton', () => {
  it.each([
    ['row', SkeletonRow],
    ['card', SkeletonCard],
  ])('the %s is hidden from the screen reader', async (_, Component) => {
    await render(<Component testID="skeleton" />);

    expect(screen.queryByTestId('skeleton')).toBeNull();
    expect(screen.getByTestId('skeleton', hidden)).toBeTruthy();
  });
});
