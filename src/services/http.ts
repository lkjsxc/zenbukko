import { setTimeout as delay } from 'node:timers/promises';

export type HttpError = {
  kind: 'http_error';
  status: number;
  url: string;
  bodySnippet?: string;
};

export type NetworkError = {
  kind: 'network_error';
  url: string;
  message: string;
};

export type FetchResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: HttpError | NetworkError };

export async function fetchJsonWithRetry<T>(
  url: URL,
  init: RequestInit,
  opts: {
    retries: number;
    minDelayMs: number;
    maxDelayMs: number;
    retryOnStatus: (status: number) => boolean;
  },
): Promise<FetchResult<T>> {
  let attempt = 0;
  let lastError: HttpError | NetworkError | undefined;

  while (attempt <= opts.retries) {
    try {
      const resp = await fetch(url, init);
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        const err: HttpError = {
          kind: 'http_error',
          status: resp.status,
          url: url.toString(),
          bodySnippet: body.slice(0, 500),
        };

        if (!opts.retryOnStatus(resp.status) || attempt === opts.retries) {
          return { ok: false, error: err };
        }
        lastError = err;
      } else {
        const json = (await resp.json()) as T;
        return { ok: true, value: json };
      }
    } catch (e) {
      const err: NetworkError = {
        kind: 'network_error',
        url: url.toString(),
        message: e instanceof Error ? e.message : String(e),
      };

      if (attempt === opts.retries) return { ok: false, error: err };
      lastError = err;
    }

    const backoff = Math.min(opts.maxDelayMs, opts.minDelayMs * 2 ** attempt);
    const jitter = Math.floor(Math.random() * Math.min(250, backoff));
    await delay(backoff + jitter);
    attempt++;
  }

  // Should be unreachable, but keeps TS happy
  return { ok: false, error: lastError ?? { kind: 'network_error', url: url.toString(), message: 'unknown' } };
}
