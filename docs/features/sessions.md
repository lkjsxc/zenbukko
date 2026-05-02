# Sessions

## Purpose

Authenticate NNN requests using browser-exported cookies.

## Inputs

- New session JSON with `savedAt`, optional `userAgent`, and cookie objects.
- Legacy session JSON with `cookies` header string and optional `created_at`.

## Outputs

- Normalized session saved at `ZENBUKKO_SESSION_PATH` or `/data/session.json`.
- `GET /api/session` returns existence, normalized session data, and a formatted JSON string for UI prefill.

## Invariants

- Legacy cookie header sessions remain supported.
- Cookie matching respects domain, path, and expiration when structured cookies are available.

## Failure Behavior

Invalid JSON or unrecognized schema returns a validation error and does not overwrite the previous session.
