export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, init);
  const raw = await res.text();
  let data: unknown = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const message = typeof data === 'object' && data && 'error' in data
      ? String((data as { error: unknown }).error)
      : raw || res.statusText || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
};

export const downloadUrl = (path: string): string => {
  const url = new URL('/api/outputs/download', window.location.origin);
  url.searchParams.set('path', path);
  return url.toString();
};
