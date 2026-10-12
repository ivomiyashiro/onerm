import { size } from '@/presentation/theme/metrics';

describe('metrics', () => {
  it('touch targets follow RNF-16', () => {
    expect(size.targetMin).toBe(48);
    expect(size.targetMain).toBe(56);
  });
});
