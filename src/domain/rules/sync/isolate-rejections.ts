/** What the server answered to one upload of rows. */
export type UploadOutcome<R> =
  /** The rows as the server stored them. */
  | { status: 'accepted'; rows: R[] }
  /** A validation rejection (not the network): the whole batch failed, without saying which row. */
  | { status: 'rejected'; reason: string };

export interface IsolatedUpload<T, R> {
  accepted: R[];
  rejected: { row: T; reason: string }[];
}

/**
 * Uploads a batch so that an invalid row doesn't block the rest (RN-SYNC-11, 07 §4.1, decided by
 * the F6 judge). The server rejects the whole batch and doesn't say which row failed, so a
 * rejected batch is split in two halves and each one is retried, recursively, until the rejected
 * rows are alone: a single row that fails is the culprit. Retrying is safe because resending an
 * accepted row changes nothing (RNF-04). A network error is not a rejection: `upload` throws it
 * and the whole push aborts.
 */
export async function uploadIsolatingRejections<T, R>(
  rows: readonly T[],
  upload: (rows: T[]) => Promise<UploadOutcome<R>>,
): Promise<IsolatedUpload<T, R>> {
  const result: IsolatedUpload<T, R> = { accepted: [], rejected: [] };
  if (rows.length === 0) return result;

  const outcome = await upload([...rows]);
  if (outcome.status === 'accepted') {
    result.accepted.push(...outcome.rows);
  } else if (rows.length === 1) {
    result.rejected.push({ row: rows[0], reason: outcome.reason });
  } else {
    const middle = Math.ceil(rows.length / 2);
    for (const half of [rows.slice(0, middle), rows.slice(middle)]) {
      const part = await uploadIsolatingRejections(half, upload);
      result.accepted.push(...part.accepted);
      result.rejected.push(...part.rejected);
    }
  }
  return result;
}
