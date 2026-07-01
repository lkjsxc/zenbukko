# Web UI

## Purpose

Use Zenbukko from a local browser while the server runs inside or outside Docker.

## Start

```sh
zenbukko api --port 8788
zenbukko web --port 8787
docker compose --profile cpu up zenbukko-web
```

Default local use runs Core API on `127.0.0.1:8788` and Web on `127.0.0.1:8787`.
The browser talks only to Web; Web proxies `/api/*` to Core API.

Default Web access binds to loopback and requires the generated browser token shown by the server. Treat that token like a local credential.

## Build

```sh
npm run build
```

UI source lives in `web-ui/`. Vite outputs to `dist/web/static/`.

## Screens

Navigate via hash routes: Dashboard, Session, Courses, Archive, Jobs, Outputs, Settings. See [`../product/ui/`](../product/ui/README.md).

## Inputs

- Existing `session.json` is read automatically when the page opens.
- Session JSON only needs to be pasted when no saved session exists or the operator wants to replace it.
- OCR settings are stored by Core API under API-owned state.
- Archive jobs accept learning URL, visual chapter selection, materials, transcription, and OCR options.
- Course detail API powers the visual chapter picker.

## Outputs

- Jobs and logs are persisted by Core API under `/data/api/jobs` in Compose.
- Downloads and derived artifacts are written under `/data/downloads` by default.
- Outputs screen lists recent Markdown, transcript, HTML, JSON, and PDF files with preview and download.
- Long log lines wrap inside the log panel instead of widening the page.

## Failure Behavior

API errors are shown via toast notifications. Missing web token shows AuthGate. Job failures preserve the log and display error text in the job table.
