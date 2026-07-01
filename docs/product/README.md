# Product

## Purpose

User-facing product contracts for Zenbukko operator experience.

## Directories

- [`ui/`](ui/README.md): Web UI information architecture, screens, components, design system.
- [`web-api-extensions.md`](web-api-extensions.md): browser API additions for UI features.

## Invariants

- Web UI is English only.
- Dark theme only.
- Browser talks only to Web server; Web proxies `/api/*` to Core API.
