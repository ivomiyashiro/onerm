import { uploadIsolatingRejections, type UploadOutcome } from '@/domain/rules/sync/isolate-rejections';

/**
 * A fake server that, like PostgREST, rejects the whole batch when any row is invalid, without
 * saying which one. It records how many requests it got.
 */
function server(invalid: ReadonlySet<number>) {
  const stored = new Set<number>();
  let requests = 0;
  return {
    stored,
    requests: () => requests,
    async upload(rows: number[]): Promise<UploadOutcome<number>> {
      requests++;
      if (rows.some((row) => invalid.has(row))) return { status: 'rejected', reason: '23514' };
      rows.forEach((row) => stored.add(row));
      return { status: 'accepted', rows };
    },
  };
}

const batch = (size: number) => Array.from({ length: size }, (_, i) => i);

describe('uploadIsolatingRejections (RN-SYNC-11, 07 §4.1)', () => {
  it('a batch without invalid rows goes up in one request', async () => {
    const fake = server(new Set());
    const result = await uploadIsolatingRejections(batch(200), (rows) => fake.upload(rows));

    expect(result.accepted).toHaveLength(200);
    expect(result.rejected).toEqual([]);
    expect(fake.requests()).toBe(1);
  });

  it('RF-SYNC-01.AC5: a batch of 200 with one invalid row uploads the other 199', async () => {
    const fake = server(new Set([137]));
    const result = await uploadIsolatingRejections(batch(200), (rows) => fake.upload(rows));

    expect(fake.stored.size).toBe(199);
    expect(fake.stored.has(137)).toBe(false);
    expect(result.accepted).toHaveLength(199);
    expect(result.rejected).toEqual([{ row: 137, reason: '23514' }]);
    // Bisection: two requests per halving (8 halvings from 200 to 1), not one per row.
    expect(fake.requests()).toBeLessThanOrEqual(1 + 2 * 8);
  });

  it('isolates each of several invalid rows', async () => {
    const fake = server(new Set([0, 9]));
    const result = await uploadIsolatingRejections(batch(10), (rows) => fake.upload(rows));

    expect(result.rejected.map(({ row }) => row)).toEqual([0, 9]);
    expect(fake.stored.size).toBe(8);
  });

  it('a network error aborts: it is not a rejection (07 §4.1)', async () => {
    const offline = () => Promise.reject(new Error('Network request failed'));

    await expect(uploadIsolatingRejections(batch(3), offline)).rejects.toThrow('Network');
  });
});
