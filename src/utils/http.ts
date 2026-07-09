const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'proxy-authorization']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function fetchWithSafeRedirects(
  url: URL,
  options: {
    headers?: Record<string, string>;
    authenticatedOrigin?: URL;
    fetchImpl?: typeof fetch;
    maxRedirects?: number;
  } = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRedirects = options.maxRedirects ?? 5;
  let current = safeHttpUrl(url);
  let headers = headersForTarget(options.headers, options.authenticatedOrigin ?? current, current);

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const response = await fetchImpl(current, {
      method: 'GET',
      redirect: 'manual',
      ...(headers ? { headers } : {}),
    });
    if (!REDIRECT_STATUSES.has(response.status)) return response;
    const location = response.headers.get('location');
    await response.body?.cancel().catch(() => undefined);
    if (!location) throw new Error(`Redirect response is missing Location: ${current}`);
    if (redirects === maxRedirects) throw new Error(`Too many redirects while fetching ${url}`);
    const next = safeHttpUrl(new URL(location, current));
    headers = headersForTarget(headers, current, next);
    current = next;
  }
  throw new Error(`Too many redirects while fetching ${url}`);
}

export function headersForTarget(
  headers: Record<string, string> | undefined,
  authenticatedOrigin: URL,
  target: URL,
): Record<string, string> | undefined {
  if (!headers) return undefined;
  if (authenticatedOrigin.origin === target.origin) return { ...headers };
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !SENSITIVE_HEADERS.has(name.toLowerCase())),
  );
}

function safeHttpUrl(url: URL): URL {
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported download URL protocol: ${url.protocol}`);
  if (url.username || url.password) throw new Error('Download URL must not contain credentials.');
  return url;
}
