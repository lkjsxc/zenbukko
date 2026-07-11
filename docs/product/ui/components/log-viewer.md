# Log Viewer

## Purpose

Stream job log lines via SSE.

## Behavior

- Append lines incrementally to a compact, independently scrollable `<pre>` with monospace styling; accumulated lines must not grow the page.
- Retain only the latest 32,768 characters in the browser and show a truncation notice when older output is discarded.
- Auto-scroll unless paused.
- Use `role="log"`, `aria-live="polite"`, and `aria-relevant="additions"`.
- Show connecting or reconnecting state persistently.
- Reconnect on error with exponential backoff.

## Inputs

- `GET /api/jobs/:id/events`

## Invariants

Close EventSource and cancel pending reconnect timers when deselecting a job or leaving Jobs.
