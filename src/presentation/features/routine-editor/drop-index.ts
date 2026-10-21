/** Where a row sits in the list, as `onLayout` measures it. */
export interface RowLayout {
  readonly y: number;
  readonly height: number;
}

/**
 * RF-RUT-05.AC1: the index a dragged row lands on. The row moves past another once its center
 * crosses that row's middle; the rows can have different heights (a long name wraps).
 */
export function dropIndex(rows: readonly RowLayout[], from: number, translationY: number): number {
  const dragged = rows[from];
  if (dragged === undefined) return from;
  const center = dragged.y + dragged.height / 2 + translationY;
  let index = from;
  if (translationY > 0) {
    while (index + 1 < rows.length && center > middle(rows[index + 1])) index++;
  } else {
    while (index > 0 && center < middle(rows[index - 1])) index--;
  }
  return index;
}

const middle = (row: RowLayout) => row.y + row.height / 2;

/**
 * How far row `index` moves out of the way while row `from` is dragged over `to`: the rows it
 * passes make room of its height, the others stay (RF-RUT-05.AC1).
 */
export function rowShift(index: number, from: number, to: number, draggedHeight: number): number {
  if (index > from && index <= to) return -draggedHeight;
  if (index < from && index >= to) return draggedHeight;
  return 0;
}

/** The distance the dragged row `from` travels to its place at `to`: the rows it passes. */
export function dropDistance(rows: readonly RowLayout[], from: number, to: number): number {
  let distance = 0;
  for (let i = from + 1; i <= to; i++) distance += rows[i]?.height ?? 0;
  for (let i = to; i < from; i++) distance -= rows[i]?.height ?? 0;
  return distance;
}
