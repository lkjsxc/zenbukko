# Web Security

## Decision

The web server is a local control surface. Default use binds to loopback and requires a generated token for browser access.

## Consequences

- Operators should treat the token like a local credential.
- Docker web services expose loopback host ports by default.
- Session cookies, settings, jobs, logs, and downloads remain local private data.
- Remote exposure requires an explicit operator network decision outside the default flow.
