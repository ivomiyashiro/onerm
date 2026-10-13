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
