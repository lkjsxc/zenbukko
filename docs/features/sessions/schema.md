# Session Schema

## Inputs

- New session JSON with `savedAt`, optional `userAgent`, and cookie objects.
- Cookie-header session JSON with `cookies` header string and optional `created_at`.

## Outputs

- Normalized session saved at `ZENBUKKO_SESSION_PATH` or `/data/session.json`.
- Stored data is local private data and must not be committed.

## Failure Behavior

Invalid JSON or unrecognized schema returns a validation error and leaves the current session file unchanged.
