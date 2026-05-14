# Web Security

## Decision

The web server is a local browser control surface. Default use binds to loopback and requires a generated token before proxying sensitive `/api/*` requests.

## Consequences

- Operators should treat the token like a local credential.
- Docker web services expose loopback host ports by default.
- Core API has no default token and stays on loopback locally or an internal Compose network.
- Session cookies, settings, jobs, logs, and downloads remain API-owned local private data.
- Web owns only static assets, proxying, and its generated browser token.
- Remote exposure requires an explicit operator network decision outside the default flow.
