# Local Data

## Private Paths

- Session JSON contains browser cookie material.
- `/data/api/settings.json` contains local operator preferences.
- `/data/api/jobs` contains operator actions and logs.
- `/data/downloads` contains course material and generated outputs.

## Handling

Keep these paths out of source control and avoid sharing them in support requests. Diagnostics may report whether a session file exists but must never read or print cookie values. Errors and Web responses must not include request cookies, authorization headers, or session JSON.

Output preview and download requests are restricted to canonical relative identifiers whose lexical and real paths remain under the configured output root.
