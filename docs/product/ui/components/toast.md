# Toast

## Purpose

Non-blocking notification for errors and success messages.

## Behavior

- Notifications queue in a bottom-right stack rather than replacing each other.
- Auto-dismiss once after 5s for success and info; persist until dismissed for errors.
- Rendering a toast never rerenders the active screen or discards form input.
- `role="alert"` for errors and `role="status"` for other notifications.

## API

`showToast(message, kind: 'info' | 'success' | 'error')`

## Invariants

Replaces all `alert()` usage. Dismiss controls have an accessible name.
