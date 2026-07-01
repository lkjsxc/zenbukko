# Configuration

## Purpose

Document environment variables and browser settings precedence.

## Environment

- `ZENBUKKO_SESSION_PATH`: session JSON path.
- `OUTPUT_DIR`: downloads directory.
- `LOG_LEVEL`: `silent|error|warn|info|debug`.
- `PUPPETEER_HEADLESS`: `true|false`.
- `WEB_PORT`: default web port.
- `ZENBUKKO_API_PORT`: default Core API port, `8788`.
- `ZENBUKKO_API_URL`: Web proxy target, default `http://127.0.0.1:8788`.
- `ZENBUKKO_WEB_DATA_DIR`: Web runtime data directory, default `data/web-ui`.
- `ZENBUKKO_WHISPER_BACKEND`: `auto|cpu|cuda`.
- `ZENBUKKO_NDLOCR_CMD`: OCR executable, default `ndlocr-lite`.
- `ZENBUKKO_NDLOCR_DEVICE`: `cpu|cuda`, default `cpu`.
- `ZENBUKKO_OCR_PAGE_DPI`: PDF rasterization DPI, default `300`.
- `ZENBUKKO_OCR_KEEP_INTERMEDIATES`: retain OCR work files, default `false`.
- `ZENBUKKO_NDLOCR_ENABLE_TCY`: enable tate-chu-yoko handling, default `true`.

## API Settings

Stored by Core API under API-owned state, `/data/api/settings.json` in Compose:

- `chapterRange`
- `ndlocrCommand`
- `ndlocrDevice`
- `ocrPageDpi`
- `ocrKeepIntermediates`
- `ndlocrEnableTcy`

## Precedence

API settings override environment values for browser-created jobs. Environment values override built-in defaults. CLI flags override configuration for that command.

## Validation

Only documented local settings are persisted or returned. Unsupported OCR provider fields are rejected by job requests and ignored when old settings files are read.
