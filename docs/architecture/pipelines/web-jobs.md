# Web Jobs Pipeline

## Purpose

Describe how browser requests become durable background work.

## Stages

1. Static UI loads session and settings through the same-origin Web proxy.
2. Trusted-network browser requests reach Core through `/api/*` proxying without a generated token.
3. Core API request parsing normalizes job payload fields.
4. The API job queue persists accepted work.
5. Worker execution calls shared CLI workflow functions.
6. Logs and status are persisted in API-owned state under `/data/api/jobs`.
7. Browser status and SSE endpoints expose progress through the proxy.

## Invariants

Web jobs use the same downloader, material, transcription, and OCR services as CLI commands.
