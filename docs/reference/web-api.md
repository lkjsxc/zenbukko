# Web API

## Purpose

Define the local web server contract.

## Endpoints

- `GET /api/status`: session existence, output directory, Gemini configuration, model.
- `GET /api/session`: normalized existing session and formatted JSON for UI prefill.
- `POST /api/session`: save normalized session JSON.
- `GET /api/settings`: effective browser settings and defaults.
- `POST /api/settings`: persist browser Gemini/OCR settings.
- `GET /api/courses`: scrape authenticated course list.
- `GET /api/jobs`: list persisted jobs.
- `POST /api/jobs`: enqueue `download`, `download-all`, or `ocr-materials`.
- `GET /api/jobs/:id`: job metadata and log.
- `GET /api/jobs/:id/events`: Server-Sent Events log stream.
- `GET /api/outputs`: recent generated files.

## Job Request Fields

Download requests may include `chapterRange`, `chapters`, `lessonIds`, `ocrMode`, and `ocrServiceTier`. `chapterRange` is resolved before downloader lesson resolution.

Download jobs that run OCR rebuild chapter OCR aggregates after lesson OCR finishes. Standalone OCR jobs rebuild chapter OCR aggregates when their input is inside the standard downloads layout.

## Failure Behavior

Validation failures return HTTP 400. Missing resources return HTTP 404. Unexpected server failures return HTTP 500 with an error message.
