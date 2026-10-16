/**
 * A fetch that gives up after `ms` (07 §4.1, #175). Without it, a request sent while the network
 * changes waits for the system's own timeout, and as two syncs never run at once, the sync that
 * getting the connection back triggers waits behind it. A timeout fails like any network error,
 * so the sync retries with its backoff. The caller's own signal still aborts it.
 */
export function fetchWithTimeout(fetchImpl: typeof fetch, ms: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const caller = init?.signal;
    if (caller?.aborted) controller.abort();
    caller?.addEventListener('abort', () => controller.abort());
    return fetchImpl(input, { ...init, signal: controller.signal }).finally(() =>
      clearTimeout(timer),
    );
  };
}
