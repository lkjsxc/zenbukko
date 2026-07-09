# Sessions

## Purpose

Authenticate NNN requests using browser-exported cookies. A saved session is normally the first requirement for course listing, downloads, and browser-created archive jobs.

## Files

- [`schema.md`](schema.md): accepted session input and stored output shapes.
- [`web-api.md`](web-api.md): browser import and API behavior.

## Invariants

- Cookie-header session imports remain supported.
- Interactive CLI auth is the normal first step before course-aware workflows.
- Interactive auth sets the login page to 80% page scale without changing Chromium device-scale launch flags.
- Structured cookie matching respects domain, path, and expiration when those fields are available.
- Invalid input does not overwrite the previous saved session.
