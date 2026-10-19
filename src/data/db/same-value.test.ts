import { sameValue } from '@/data/db/same-value';

describe('sameValue (#230)', () => {
  it('equal rows read twice are the same value', () => {
    const read = () => ({
      id: 'squat',
      aliases: ['sentadilla'],
      updatedAt: new Date(1),
      notes: null,
      pending: new Set(['w-1']),
      byDay: new Map([['d-1', [1, 2]]]),
    });

    expect(sameValue(read(), read())).toBe(true);
  });

  it.each([
    ['a field', { a: 1 }, { a: 2 }],
    ['a missing field', { a: 1 }, { a: 1, b: undefined }],
    ['an array length', [1], [1, 1]],
    ['a nested value', [{ a: [1] }], [{ a: [2] }]],
    ['a date', new Date(1), new Date(2)],
    ['a set', new Set([1]), new Set([2])],
    ['a map value', new Map([['a', 1]]), new Map([['a', 2]])],
    ['null and an object', null, {}],
    ['an array and an object', [], {}],
  ])('a different %s is a change', (_, a, b) => {
    expect(sameValue(a, b)).toBe(false);
  });
});
