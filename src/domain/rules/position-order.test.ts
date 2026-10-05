import { byPosition, sortByPosition } from '@/domain/rules/position-order';

describe('I-10 · order by (position, id)', () => {
  it('orders by position', () => {
    const items = [
      { id: 'c', position: 2 },
      { id: 'a', position: 0 },
      { id: 'b', position: 1 },
    ];

    expect(sortByPosition(items).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('breaks a repeated position by id, so two devices reordering at once agree', () => {
    const fromDeviceA = [
      { id: 'y', position: 1 },
      { id: 'x', position: 1 },
      { id: 'z', position: 0 },
    ];
    const fromDeviceB = [...fromDeviceA].reverse();

    expect(sortByPosition(fromDeviceA).map((item) => item.id)).toEqual(['z', 'x', 'y']);
    expect(sortByPosition(fromDeviceB)).toEqual(sortByPosition(fromDeviceA));
  });

  it('compares ids by code unit, not by locale', () => {
    // localeCompare would put 'a' before 'B'; the order must not depend on the device language.
    expect(
      [
        { id: 'a', position: 0 },
        { id: 'B', position: 0 },
      ].sort(byPosition)[0].id,
    ).toBe('B');
  });

  it('does not mutate the input', () => {
    const items = [
      { id: 'b', position: 1 },
      { id: 'a', position: 0 },
    ];

    sortByPosition(items);

    expect(items[0].id).toBe('b');
  });
});
