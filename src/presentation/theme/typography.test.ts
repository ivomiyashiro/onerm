import { typography } from '@/presentation/theme/typography';

// Invariants of the text styles; their values are checked against Figma, not here.
describe('typography', () => {
  it('numbers and times use tabular digits', () => {
    for (const name of ['numberHero', 'numberS', 'numberKeypad', 'monoL', 'monoXs'] as const) {
      expect(typography[name].fontVariant).toEqual(['tabular-nums']);
    }
  });

  it('never sets fontWeight: each weight is its own font file', () => {
    for (const style of Object.values(typography)) {
      expect(style).not.toHaveProperty('fontWeight');
    }
  });
});
