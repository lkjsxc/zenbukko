# Log Viewer

## Purpose

Stream job log lines via SSE.

## Behavior

- Append lines to `<pre>` with monospace styling.
- Auto-scroll unless paused.
- `aria-live="polite"`.
- Reconnect on error with exponential backoff.

## Inputs

- `GET /api/jobs/:id/events?token=`

## Invariants

Close EventSource when deselecting job or leaving Jobs screen.
