export type SseHandle = { close: () => void };

export const openJobStream = (
  token: string,
  jobId: string,
  onLine: (line: string) => void,
  onError: () => void,
): SseHandle => {
  const url = new URL(`/api/jobs/${jobId}/events`, window.location.origin);
  if (token) url.searchParams.set('token', token);
  const es = new EventSource(url.pathname + url.search);
  let backoff = 1000;

  es.onmessage = (ev) => {
    backoff = 1000;
    onLine(JSON.parse(ev.data) as string);
  };

  es.onerror = () => {
    es.close();
    onError();
    window.setTimeout(() => {
      openJobStream(token, jobId, onLine, onError);
    }, backoff);
    backoff = Math.min(backoff * 2, 30000);
  };

  return { close: () => es.close() };
};
