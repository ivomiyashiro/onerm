import { loadNumber, parseDecimal } from '@/presentation/strings/numbers';

describe('RN-PERF-05 · numbers on screen', () => {
  it('kg with up to 2 decimals and lb with 1, with a comma and no trailing zeros', () => {
    expect(loadNumber(2.5, 'kg')).toBe('2,5');
    expect(loadNumber(20, 'kg')).toBe('20');
    expect(loadNumber(1.256, 'kg')).toBe('1,26');
    expect(loadNumber(2.25, 'lb')).toBe('2,3');
  });

  it('reads a comma or a dot as the decimal mark, and rejects anything else', () => {
    expect(parseDecimal('2,5')).toBe(2.5);
    expect(parseDecimal(' 1.25 ')).toBe(1.25);
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
  });
});
