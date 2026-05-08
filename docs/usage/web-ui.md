# Web UI

## Purpose

Use Zenbukko from a local browser while the server runs inside or outside Docker.

## Start

```sh
zenbukko web --host 0.0.0.0 --port 8787
docker compose up zenbukko-web
```

## Inputs

- Session JSON can be pasted into the Session panel.
- Existing `session.json` is loaded by `GET /api/session` and pre-filled.
- OCR settings are stored locally under `/data/web/settings.json`.
- Study jobs accept learning URL, chapter range, explicit chapter IDs, lesson IDs, materials, transcription, and OCR settings.
- Saved OCR settings are applied when web jobs run.

## Outputs

- Jobs and logs are persisted under `/data/web/jobs`.
- Downloads and derived artifacts are written under `/data/downloads` by default.
- The output list shows recent Markdown, transcript, HTML, JSON, and PDF files.
- Long log lines wrap inside the log panel instead of widening the page.

## Failure Behavior

API errors are shown in the browser. Job failures preserve the log and final error message for later inspection.
