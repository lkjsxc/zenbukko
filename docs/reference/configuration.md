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
- `ZENBUKKO_WEB_DATA_DIR`: Web token directory, default `data/web-ui`.
- `GEMINI_API_KEY`: cloud OCR key for Google Gemini (optional when local OCR is selected).
- `GEMINI_MODEL`: cloud OCR model, default `gemini-3.1-flash-lite`.
- `ZENBUKKO_WHISPER_BACKEND`: `auto|cpu|cuda`.
- `ZENBUKKO_OCR_BACKEND`: `auto|local|gemini` (default `auto`).

## API Settings

Stored by Core API under API-owned state, `/data/api/settings.json` in Compose:

- `ocrBackend`
- `geminiApiKey`
- `geminiModel`
- `ocrMode` (Gemini planning only)
- `ocrServiceTier`
- `ocrRetries`
- `ocrTimeoutMs`
- `chapterRange`

## Precedence

API settings override environment values for browser-created jobs. Environment values override built-in defaults. CLI flags override configuration for that command.
