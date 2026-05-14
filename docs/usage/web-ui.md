# Web UI

## Purpose

Use Zenbukko from a local browser while the server runs inside or outside Docker.

## Start

```sh
zenbukko web --port 8787
docker compose up zenbukko-web
```

Default local use binds to loopback and requires the generated browser token shown by the server. Treat that token like a local credential.
Use `--host 0.0.0.0` only for an explicitly protected remote environment.

## Inputs

- Existing `session.json` is read automatically when the page opens.
- Session JSON only needs to be pasted when no saved session exists or the operator wants to replace it.
- OCR settings are stored locally under `/data/web/settings.json`.
- `ocrBackend` accepts `auto`, `local`, or `gemini`; the default is `auto`.
- Study jobs accept learning URL, chapter range, explicit chapter IDs, lesson IDs, materials, transcription, and OCR settings.
- Saved OCR settings are applied when web jobs run.

## Outputs

- Jobs and logs are persisted under `/data/web/jobs`.
- Downloads and derived artifacts are written under `/data/downloads` by default.
- The output list shows recent Markdown, transcript, HTML, JSON, and PDF files.
- Long log lines wrap inside the log panel instead of widening the page.

## Failure Behavior

API errors are shown in the browser. Job failures preserve the log and final error message for later inspection.
