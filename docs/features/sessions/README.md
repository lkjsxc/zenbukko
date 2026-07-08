# Sessions

## Purpose

Authenticate NNN requests using browser-exported cookies.

## Files

- [`schema.md`](schema.md): accepted session input and stored output shapes.
- [`web-api.md`](web-api.md): browser import and API behavior.

## Invariants

- Cookie-header session imports remain supported.
- Interactive auth opens the login browser at about 25% page scale.
- Structured cookie matching respects domain, path, and expiration when those fields are available.
- Invalid input does not overwrite the previous saved session.
