# Web Loopback

## Behavior

- The default web flow binds to loopback.
- Browser access requires a generated token.
- Web enforces the token before proxying sensitive `/api/*` requests.
- `GET /api/status` remains public for UI bootstrap.
- Job SSE accepts the token query parameter because browser `EventSource` cannot set custom headers.
- Core API has no token by default and should stay on loopback or an internal Compose network.
- Docker web services publish loopback host ports by default.

## Operator Responsibility

Do not expose the web service beyond trusted local access unless a separate access-control layer is provided.
