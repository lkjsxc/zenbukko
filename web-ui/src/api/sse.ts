export type SseHandle = { close: () => void };

type StreamHandlers = {
  onLine: (line: string) => void;
  onOpen: () => void;
  onReconnecting: (delayMs: number) => void;
};

export const openJobStream = (jobId: string, handlers: StreamHandlers): SseHandle => {
  let source: EventSource | null = null;
  let retryTimer: number | null = null;
  let backoff = 1000;
  let closed = false;

  const connect = (): void => {
    if (closed) return;
    const url = new URL(`/api/jobs/${encodeURIComponent(jobId)}/events`, window.location.origin);
    source = new EventSource(url.pathname + url.search);
    source.onopen = () => {
      backoff = 1000;
      handlers.onOpen();
    };
    source.onmessage = (event) => {
      try {
        const line = JSON.parse(event.data) as unknown;
        handlers.onLine(typeof line === 'string' ? line : String(line));
      } catch {
        handlers.onLine(event.data);
      }
    };
    source.onerror = () => {
      source?.close();
      source = null;
      if (closed || retryTimer !== null) return;
      const delay = backoff;
      handlers.onReconnecting(delay);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
      backoff = Math.min(backoff * 2, 30000);
    };
  };

  connect();
  return {
    close: () => {
      closed = true;
      source?.close();
      source = null;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      retryTimer = null;
    },
  };
};
