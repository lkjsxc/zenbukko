# Web API

## Purpose

Define the browser-facing API contract.

Web exposes these endpoints at same origin and proxies them to Core API. Default browser access uses trusted local or private-network exposure without a generated browser token.

## Endpoints

- `GET /api/status`: session existence, output directory, local OCR readiness, and auth flag.
- `GET /api/session`: normalized existing session and formatted JSON for UI prefill.
- `POST /api/session`: save normalized session JSON.
- `GET /api/settings`: effective local settings and defaults.
- `POST /api/settings`: persist local OCR settings.
- `GET /api/courses`: retired endpoint that returns HTTP 410; course-list scraping is CLI-only via `zenbukko list-courses --format json`.
- `GET /api/courses/:courseId`: course title and chapters for chapter picker.
- `GET /api/courses/:courseId/chapters/:chapterId`: chapter sections for advanced filtering.
- `GET /api/jobs`: list persisted jobs.
- `POST /api/jobs`: enqueue `download`, `download-all`, or `ocr-materials`.
- `GET /api/jobs/:id`: job metadata and log.
- `GET /api/jobs/:id/events`: Server-Sent Events log stream.
- `GET /api/outputs`: recent generated files.
- `GET /api/outputs/content`: text preview of a file under output directory.
- `GET /api/outputs/download`: download a file under output directory.
- `GET /healthz`: Core API health check, not proxied by Web for browser use.

## Status Shape

`GET /api/status` returns `sessionExists`, `outputDir`, `authRequired: false`, and `localOcr` with command, device, `ok`, and diagnostics.

## Job Request Fields

Download requests may include `chapterRange`, `chapters`, `lessonIds`, transcription fields, material toggles, and local OCR fields. `chapterRange` is resolved before downloader lesson resolution.

Local OCR fields are `ndlocrCommand`, `ndlocrDevice`, `ocrPageDpi`, `ocrKeepIntermediates`, `ndlocrEnableTcy`, and `ocrForce`.

Download jobs that run OCR rebuild chapter OCR aggregates after lesson OCR finishes. Standalone OCR jobs rebuild chapter OCR aggregates when their input is inside the standard downloads layout.

## Failure Behavior

Validation failures return HTTP 400. Missing resources return HTTP 404. Unexpected server failures return HTTP 500 with an error message.
