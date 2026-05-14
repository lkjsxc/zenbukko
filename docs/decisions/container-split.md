# Web/Core Container Split

## Decision

Zenbukko runs as two cooperating server modes:

- `zenbukko api`: Core API on port `8788`.
- `zenbukko web`: static browser UI and same-origin proxy on port `8787`.

Docker Compose mirrors that split with `zenbukko-api` and `zenbukko-web`. The GPU profile uses `zenbukko-api-gpu` for CUDA-capable OCR/Whisper work and `zenbukko-web-gpu` for the lightweight proxy.

## Rationale

The browser container should not need downloads, session state, Chromium automation, OCR binaries, Whisper, or GPU runtime access. Keeping these responsibilities in Core API reduces the Web container blast radius and makes GPU selection an API concern only.

## Locked Behavior

- Web stores only its generated browser token under `ZENBUKKO_WEB_DATA_DIR`.
- Web proxies `/api/*` to `ZENBUKKO_API_URL`.
- `GET /api/status` is public.
- Sensitive `/api/*` endpoints require the Web token before proxying.
- SSE keeps query-token support for browser `EventSource`.
- Core API has no token by default and is bound to loopback locally or an internal Compose network.
- Compose publishes only Web ports to the host.
