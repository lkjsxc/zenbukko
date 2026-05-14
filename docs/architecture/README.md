# Architecture

## Purpose

Zenbukko is a local-first Node 22 TypeScript application with CLI, web, downloader, OCR, and transcription boundaries.

## Files

- [`overview.md`](overview.md): runtime shape and process model.
- [`data-flow.md`](data-flow.md): request-to-output flow.
- [`module-map.md`](module-map.md): source module responsibilities.
- [`pipelines/`](pipelines/README.md): cross-module workflow contracts.

## Invariants

- CLI and Core API call shared service modules instead of duplicating behavior.
- Long-running browser-created work runs through the API persisted job queue.
- Session, settings, downloads, jobs, and generated OCR manifests live under API-owned `/data` in Docker.
