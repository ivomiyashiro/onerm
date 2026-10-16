/**
 * A fetch that gives up when no response (its headers) arrives within `ms` (07 §4.1, #175).
 * Without it, a request sent while the network changes waits for the system's own timeout, and
 * as two syncs never run at once, the next sync waits behind it. A timeout fails like any network
 * error, so the sync retries with its backoff. The caller's own signal still aborts it.
 */
export function fetchWithTimeout(fetchImpl: typeof fetch, ms: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timer = setTimeout(abort, ms);
    const caller = init?.signal;
    if (caller?.aborted) abort();
    caller?.addEventListener('abort', abort, { once: true });
    return fetchImpl(input, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timer);
      caller?.removeEventListener('abort', abort);
    });
  };
}
