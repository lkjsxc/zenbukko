# Sessions

## Purpose

Authenticate NNN requests using browser-exported cookies. A saved session is normally the first requirement for course listing, downloads, and browser-created archive jobs.

## Files

- [`schema.md`](schema.md): accepted session input and stored output shapes.
- [`web-api.md`](web-api.md): browser import and API behavior.

## Invariants

- Cookie-header session imports remain supported.
- Interactive CLI auth is the normal first step before course-aware workflows.
- Interactive auth opens a larger `1280x900` browser window with Puppeteer's fixed default viewport disabled.
- Browser selection follows the documented executable precedence, including installed Microsoft Edge on Windows.
- Auth releases terminal listeners and closes the browser before returning; closing the browser early fails with an actionable message.
- Structured cookie matching respects domain, path, and expiration when those fields are available.
- Invalid input does not overwrite the previous saved session.
- Session cookie values are never included in diagnostics, logs, or error responses.
