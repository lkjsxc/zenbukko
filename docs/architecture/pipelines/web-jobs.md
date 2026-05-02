# Web Jobs Pipeline

## Purpose

Describe how browser requests become durable background work.

## Stages

1. Static UI loads session and settings.
2. Request parsing normalizes job payload fields.
3. The job queue persists accepted work.
4. Worker execution calls shared CLI workflow functions.
5. Logs and status are persisted under `/data/web/jobs`.
6. Browser status and SSE endpoints expose progress.

## Invariants

Web jobs use the same downloader, material, transcription, and OCR services as CLI commands.
