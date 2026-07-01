# Architecture Overview

## Purpose

Describe the stable runtime boundaries for maintainers and LLM agents.

## Runtime Boundaries

- `src/index.ts` defines CLI commands and translates command options into service calls.
- `src/api/` owns the Core API, session/settings state, jobs, outputs, and queue execution.
- `src/web/` owns static UI serving and same-origin `/api/*` proxying.
- `web-ui/` owns Vite-built TypeScript browser source; build output lands in `dist/web/static/`.
- `src/commands/` owns user workflows that are also callable from web jobs.
- `src/services/` owns remote NNN scraping/API clients, material downloads, OCR, and cleanup helpers.
- `src/downloader/` owns file and HLS transfer primitives.
- `src/session/` owns session import, normalization, storage, and cookie-header generation.
- `src/whisper/` owns local whisper.cpp path and backend resolution.

## Inputs

- Browser session JSON saved at `ZENBUKKO_SESSION_PATH` or `/data/session.json`.
- NNN course IDs, chapter IDs, lesson IDs, or one-based chapter ranges.
- OCR settings and optional cloud API key from Core API settings or environment.
- Whisper model name and optional backend selection.

## Outputs

- Course folders under `OUTPUT_DIR` or `/data/downloads`.
- Lesson media, materials, transcripts, OCR Markdown, chapter Markdown, manifests, and API job logs.

## Failure Behavior

Workflows fail early when required credentials or local binaries are missing. Bulk workflows record per-course or per-PDF failures and continue when the operation is designed to be best-effort.
