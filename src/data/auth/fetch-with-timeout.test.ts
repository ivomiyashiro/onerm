import { fetchWithTimeout } from '@/data/auth/fetch-with-timeout';

jest.useFakeTimers();

/** A fetch that only ends when its signal aborts, like a request stuck on a dead network. */
const stuck: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) =>
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
  );

describe('fetchWithTimeout (07 §4.1, #175)', () => {
  it('a request with no answer fails after the timeout, so the sync can retry', async () => {
    const request = fetchWithTimeout(stuck, 15_000)('https://x.test');
    const failed = expect(request).rejects.toThrow();

    jest.advanceTimersByTime(15_000);

    await failed;
  });

  it('a request that answers in time is not touched', async () => {
    const ok = new Response('ok');
    const answer: typeof fetch = async () => ok;

    await expect(fetchWithTimeout(answer, 15_000)('https://x.test')).resolves.toBe(ok);
  });

  it('the caller can still abort it', async () => {
    const caller = new AbortController();
    const request = fetchWithTimeout(stuck, 15_000)('https://x.test', { signal: caller.signal });
    const failed = expect(request).rejects.toThrow();

    caller.abort();

    await failed;
  });
});
