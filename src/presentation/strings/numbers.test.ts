import {
  countdown,
  elapsed,
  loadNumber,
  longDate,
  parseDecimal,
  shortDate,
  wholeNumber,
} from '@/presentation/strings/numbers';

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

describe('wholeNumber (RN-ENT-13)', () => {
  it('rounds to a whole number with a dot every three digits', () => {
    expect(wholeNumber(4249.6)).toBe('4.250');
    expect(wholeNumber(1234567)).toBe('1.234.567');
    expect(wholeNumber(980)).toBe('980');
  });
});

describe('elapsed', () => {
  it('minutes and seconds, with the hours once past one', () => {
    expect(elapsed((18 * 60 + 42) * 1000)).toBe('18:42');
    expect(elapsed(5 * 1000)).toBe('0:05');
    expect(elapsed((3600 + 5 * 60 + 9) * 1000)).toBe('1:05:09');
  });
});

describe('countdown (RN-ENT-07)', () => {
  it('whole seconds left, rounded up, with two-digit minutes', () => {
    expect(countdown(74_000)).toBe('01:14');
    expect(countdown(73_200)).toBe('01:14');
    expect(countdown(0)).toBe('00:00');
    expect(countdown(-500)).toBe('00:00');
  });
});

describe('longDate', () => {
  it('D02: the weekday, the day and the month, in the device zone', () => {
    expect(longDate(new Date(2026, 8, 28, 18))).toBe('lunes 28 de septiembre');
  });
});

describe('shortDate', () => {
  it('S20: the day and the first three letters of the month', () => {
    expect(shortDate(new Date(2026, 8, 30, 18))).toBe('30 sep');
  });
});
