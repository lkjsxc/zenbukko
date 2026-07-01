# Module Map

## Purpose

Define ownership for source modules so refactors stay narrow.

## CLI

- `src/index.ts`: command registration and option translation only.
- `src/commands/download.ts`: single-course workflow orchestration.
- `src/commands/downloadAll.ts`: authenticated course discovery and repeated single-course downloads.
- `src/commands/setupWhisper.ts`: whisper.cpp clone/build/model installation.
- `src/commands/transcribe.ts`: local media-to-transcript workflow.

## Core API

- `src/api/server.ts`: Core API Express assembly on port `8788`.
- `src/api/routes.ts`: `/api/*` and `/healthz` route registration.
- `src/api/queue.ts`: persisted job queue and log streaming.
- `src/api/settings.ts`: settings persistence and precedence.
- `src/api/requests.ts`: request normalization and validation.

## Web

- `src/web/server.ts`: static UI server assembly on port `8787`.
- `src/web/auth.ts`: generated browser token loading and validation.
- `src/web/proxy.ts`: browser token enforcement and `/api/*` proxying to Core API.
- `web-ui/`: Vite TypeScript browser source (views, components, styles).
- `dist/web/static/`: built UI assets served by Express.
- `src/api/courseRoutes.ts`: course detail endpoints for chapter picker.
- `src/api/outputRoutes.ts`: output preview and download endpoints.
- `src/api/outputPath.ts`: safe path resolution under output directory.

## Services

- `src/services/nnnClient.ts`: authenticated NNN API client and lesson resolution.
- `src/services/nnnSchemas.ts`: response normalization.
- `src/services/materials.ts`: material page fetch, asset extraction, and offline index writing.
- `src/services/geminiOcr.ts`: OCR workflow entrypoint and result manifest writing (backend abstraction point).
- `src/services/courseScraper.ts`: browser scraping for enrolled courses.

## Utilities

Shared helpers under `src/utils/` must remain generic and side-effect-light.
