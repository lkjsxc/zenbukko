# Web Security

## Decision

The web server is a trusted-network browser control surface. It does not require a generated browser token before proxying `/api/*` requests.

## Consequences

- Operators must expose Web only on trusted networks or behind a separate access-control layer.
- Docker web services publish `0.0.0.0:8787` by default for trusted-network access.
- Core API has no default token and stays on loopback locally or an internal Compose network.
- Session cookies, settings, jobs, logs, and downloads remain API-owned local private data.
- Web owns only static assets and same-origin proxying.
