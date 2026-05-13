# Configuration

## Purpose

Document environment variables and browser settings precedence.

## Environment

- `ZENBUKKO_SESSION_PATH`: session JSON path.
- `OUTPUT_DIR`: downloads directory.
- `LOG_LEVEL`: `silent|error|warn|info|debug`.
- `PUPPETEER_HEADLESS`: `true|false`.
- `WEB_PORT`: default web port.
- `GEMINI_API_KEY`: cloud OCR key for Google Gemini (optional when local OCR is selected).
- `GEMINI_MODEL`: cloud OCR model, default `gemini-3.1-flash-lite`.
- `ZENBUKKO_WHISPER_BACKEND`: `auto|cpu|cuda`.
- `ZENBUKKO_OCR_BACKEND`: `auto|local|gemini` (default `auto`).

## Web Settings

Stored at `/data/web/settings.json`:

- `ocrBackend`
- `geminiApiKey`
- `geminiModel`
- `ocrMode` (Gemini planning only)
- `ocrServiceTier`
- `ocrRetries`
- `ocrTimeoutMs`
- `chapterRange`

## Precedence

Web settings override environment values for browser-created jobs. Environment values override built-in defaults. CLI flags override configuration for that command.
