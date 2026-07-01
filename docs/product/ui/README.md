# Web UI

## Purpose

Product contract for the Zenbukko browser operator console.

## Directories

- [`information-architecture.md`](information-architecture.md): screens and journeys.
- [`navigation.md`](navigation.md): hash routes and layout.
- [`accessibility.md`](accessibility.md): a11y requirements.
- [`error-handling.md`](error-handling.md): toast, auth gate, SSE reconnect.
- [`screens/`](screens/README.md): per-screen contracts.
- [`components/`](components/README.md): reusable UI components.
- [`design-system/`](design-system/README.md): tokens and typography.

## Invariants

- Built with Vite + TypeScript from `web-ui/`.
- Output served from `dist/web/static/`.
- English copy only; dark theme only.
- Web access relies on trusted-network exposure; no browser token is required.

## Failure Behavior

API errors show toast notifications.
