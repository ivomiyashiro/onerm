import {
  dropDistance,
  dropIndex,
  rowShift,
} from '@/presentation/features/routine-editor/drop-index';

/** Three 72 dp rows and a taller one, as `onLayout` measures them. */
const ROWS = [
  { y: 0, height: 72 },
  { y: 72, height: 72 },
  { y: 144, height: 92 },
  { y: 236, height: 72 },
];

describe('dropIndex', () => {
  it('RF-RUT-05.AC1: a short drag leaves the row where it was', () => {
    expect(dropIndex(ROWS, 1, 20)).toBe(1);
    expect(dropIndex(ROWS, 1, -20)).toBe(1);
  });

  it('RF-RUT-05.AC1: dragging past the middle of another row takes its place', () => {
    expect(dropIndex(ROWS, 0, 80)).toBe(1);
    expect(dropIndex(ROWS, 0, 160)).toBe(2);
    expect(dropIndex(ROWS, 3, -100)).toBe(2);
  });

  it('stops at the first and the last position', () => {
    expect(dropIndex(ROWS, 1, -500)).toBe(0);
    expect(dropIndex(ROWS, 1, 900)).toBe(3);
  });
});

describe('rowShift', () => {
  it('RF-RUT-05.AC1: the rows the dragged one passes move a row height out of its way', () => {
    // Row 0 dragged down to 2: rows 1 and 2 go up; row 3 stays.
    expect([1, 2, 3].map((i) => rowShift(i, 0, 2, 72))).toEqual([-72, -72, 0]);
    // Row 3 dragged up to 1: rows 1 and 2 go down; row 0 stays.
    expect([0, 1, 2].map((i) => rowShift(i, 3, 1, 72))).toEqual([0, 72, 72]);
  });

  it('leaves the dragged row, and everything when it has not moved, in place', () => {
    expect(rowShift(1, 1, 3, 72)).toBe(0);
    expect([0, 1, 2, 3].map((i) => rowShift(i, 1, 1, 72))).toEqual([0, 0, 0, 0]);
  });
});

describe('dropDistance', () => {
  it('RF-RUT-05.AC1: how far the row travels from where it was to where it lands', () => {
    expect(dropDistance(ROWS, 0, 2)).toBe(72 + 92);
    expect(dropDistance(ROWS, 3, 1)).toBe(-(72 + 92));
    expect(dropDistance(ROWS, 1, 1)).toBe(0);
  });
});
