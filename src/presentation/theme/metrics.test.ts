import { radius, size, space } from '@/presentation/theme/metrics';

describe('metrics', () => {
  it('touch targets follow RNF-16', () => {
    expect(size.targetMin).toBe(48);
    expect(size.targetMain).toBe(56);
  });

  it('copies the Figma radii and spacing', () => {
    expect(radius).toEqual({ xs: 2, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 999 });
    expect(Object.values(space)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 56]);
  });
});
