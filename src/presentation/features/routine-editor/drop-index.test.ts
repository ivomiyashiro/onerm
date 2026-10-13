import { dropIndex } from '@/presentation/features/routine-editor/drop-index';

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
