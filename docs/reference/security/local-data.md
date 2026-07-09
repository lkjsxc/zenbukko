# Local Data

## Private Paths

- Session JSON contains browser cookie material.
- `/data/api/settings.json` contains local operator preferences.
- `/data/api/jobs` contains operator actions and logs.
- `/data/downloads` contains course material and generated outputs.

## Handling

Keep these paths out of source control and avoid sharing them in support requests. Diagnostics may report whether a session file exists but must never read or print cookie values. Errors and Web responses must not include request cookies, authorization headers, or session JSON.

Output preview and download requests are restricted to canonical relative identifiers whose lexical and real paths remain under the configured output root. API-created OCR jobs are restricted to directories under that same output root.

Authenticated material and media headers are sent only to the originating URL. Cookie and authorization headers are removed before cross-origin asset, playlist, segment, or redirect requests. Material PDF rendering disables JavaScript and network requests.
