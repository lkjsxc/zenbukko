# Module Map

## Purpose

Define ownership for source modules so refactors stay narrow.

## CLI

- `src/index.ts`: command registration and option translation only.
- `src/commands/download.ts`: single-course workflow orchestration.
- `src/commands/downloadAll.ts`: authenticated course discovery and repeated single-course downloads.
- `src/commands/setupWhisper.ts`: whisper.cpp clone/build/model installation.
- `src/commands/transcribe.ts`: local media-to-transcript workflow.

## Web

- `src/web/server.ts`: Express assembly.
- `src/web/routes.ts`: HTTP route registration.
- `src/web/queue.ts`: persisted job queue and log streaming.
- `src/web/settings.ts`: browser settings persistence and precedence.
- `src/web/requests.ts`: request normalization and validation.
- `src/web/static/`: browser HTML, CSS, and JavaScript.

## Services

- `src/services/nnnClient.ts`: authenticated NNN API client and lesson resolution.
- `src/services/nnnSchemas.ts`: response normalization.
- `src/services/materials.ts`: material page fetch, asset extraction, and offline index writing.
- `src/services/geminiOcr.ts`: OCR workflow entrypoint and result manifest writing.
- `src/services/courseScraper.ts`: browser scraping for enrolled courses.

## Utilities

Shared helpers under `src/utils/` must remain generic and side-effect-light.
