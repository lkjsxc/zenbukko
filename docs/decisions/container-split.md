# Web/Core Container Split

## Decision

Zenbukko runs as two cooperating server modes:

- `zenbukko api`: Core API on port `8788`.
- `zenbukko web`: static browser UI and same-origin proxy on port `8787`.

Docker Compose mirrors that split with `zenbukko-api`/`zenbukko-web`, `zenbukko-api-cuda`/`zenbukko-web-cuda`, and `zenbukko-api-vulkan`/`zenbukko-web-vulkan`. Accelerators belong only to Core API; all profiles keep NDLOCR-Lite CPU-based.

## Rationale

The browser container should not need downloads, session state, Chromium automation, OCR binaries, Whisper, or GPU runtime access. Keeping these responsibilities in Core API reduces the Web container blast radius and makes GPU selection an API concern only.

## Locked Behavior

- Web proxies `/api/*` to `ZENBUKKO_API_URL` without a Zenbukko browser-token gate.
- `GET /api/status` reports `authRequired: false`.
- Core API has no token by default and is bound to loopback locally or an internal Compose network.
- Compose publishes only Web ports to the host.
- Vulkan maps only Core API DRM render devices and keeps the Web proxy unprivileged and GPU-free.
