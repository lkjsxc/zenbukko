export const loadWebToken = (): string => '';

export const apiFetch = async <T>(_token: string, path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers ?? {});
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({})) as { error?: string };
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as T;
};

export const downloadUrl = (_token: string, path: string): string => {
  const url = new URL('/api/outputs/download', window.location.origin);
  url.searchParams.set('path', path);
  return url.toString();
};
