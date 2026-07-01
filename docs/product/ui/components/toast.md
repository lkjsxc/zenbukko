# Toast

## Purpose

Non-blocking notification for errors and success messages.

## Behavior

- Stack bottom-right.
- Auto-dismiss after 5s for success; persist until dismiss for errors.
- `role="alert"` for error toasts.

## API

`showToast(message, kind: 'info' | 'success' | 'error')`

## Invariants

Replaces all `alert()` usage.
