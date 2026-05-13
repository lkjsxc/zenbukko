# Web Jobs Pipeline

## Purpose

Describe how browser requests become durable background work.

## Stages

1. Static UI loads session and settings.
2. Browser access is checked against loopback and the generated token.
3. Request parsing normalizes job payload fields.
4. The job queue persists accepted work.
5. Worker execution calls shared CLI workflow functions.
6. Logs and status are persisted under `/data/web/jobs`.
7. Browser status and SSE endpoints expose progress.

## Invariants

Web jobs use the same downloader, material, transcription, and OCR services as CLI commands.
