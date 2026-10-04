import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  SkeletonBlock,
  SkeletonCard,
  SkeletonRow,
} from '@/presentation/components/feedback/skeleton';
import { colors } from '@/presentation/theme';

const hidden = { includeHiddenElements: true };

describe('Skeleton', () => {
  it('a block has the given size in the raised color', async () => {
    await render(<SkeletonBlock width={200} height={14} testID="block" />);

    expect(StyleSheet.flatten(screen.getByTestId('block', hidden).props.style)).toMatchObject({
      width: 200,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.bgRaised,
    });
  });

  it.each([
    ['row', SkeletonRow],
    ['card', SkeletonCard],
  ])('the %s is hidden from the screen reader', async (_, Component) => {
    await render(<Component testID="skeleton" />);

    expect(screen.queryByTestId('skeleton')).toBeNull();
    expect(screen.getByTestId('skeleton', hidden)).toBeTruthy();
  });
});
