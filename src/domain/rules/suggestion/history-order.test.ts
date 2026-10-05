import { byFinishedAt, firstFinishedFrom } from '@/domain/rules/suggestion/history-order';

const at = (n: number) => ({ id: n, finishedAt: new Date(n * 1000) });

describe('history order', () => {
  it('orders by finishedAt without touching the input', () => {
    const input = [at(3), at(1), at(2)];

    expect(byFinishedAt(input).map((item) => item.id)).toEqual([1, 2, 3]);
    expect(input[0].id).toBe(3);
  });

  it('finds the first item finished at or after an instant', () => {
    const ordered = [at(1), at(3), at(3), at(5)];

    expect(firstFinishedFrom(ordered, new Date(0))).toBe(0);
    expect(firstFinishedFrom(ordered, new Date(3000))).toBe(1);
    expect(firstFinishedFrom(ordered, new Date(3000), true)).toBe(3);
    expect(firstFinishedFrom(ordered, new Date(4000))).toBe(3);
    expect(firstFinishedFrom(ordered, new Date(9000))).toBe(4);
    expect(firstFinishedFrom([], new Date(0))).toBe(0);
  });
});
