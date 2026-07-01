const TOKEN_KEY = 'zenbukko.webToken';

export const loadWebToken = (): string => {
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('token');
  if (fromUrl) {
    localStorage.setItem(TOKEN_KEY, fromUrl);
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    return fromUrl;
  }
  return localStorage.getItem(TOKEN_KEY) ?? '';
};

export const apiFetch = async <T>(token: string, path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers ?? {});
  if (token) headers.set('X-Zenbukko-Token', token);
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({})) as { error?: string };
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as T;
};

export const downloadUrl = (token: string, path: string): string => {
  const url = new URL('/api/outputs/download', window.location.origin);
  url.searchParams.set('path', path);
  if (token) url.searchParams.set('token', token);
  return url.toString();
};
