# Settings Schema

## Purpose

Browser settings persist operator preferences under `/data/web/settings.json`.

## Fields

- `ocrBackend`: `auto`, `local`, or `gemini` (default `auto`).
- `geminiApiKey`: optional Gemini key for cloud OCR.
- `geminiModel`: cloud OCR model, default `gemini-3.1-flash-lite`.
- `ocrMode`: `auto`, `batch`, or `flex`; Gemini planning only.
- `ocrServiceTier`: `flex` or `standard`.
- `chapterRange`: one-based chapter ordinal range expression.
- `ocrRetries`: retry count for Flex recovery.
- `ocrTimeoutMs`: timeout for Gemini OCR calls.
- `ndlocrCommand`, `ndlocrDevice`, `ocrPageDpi`, `ocrKeepIntermediates`, `ndlocrEnableTcy`: local OCR knobs.

## Precedence

Web settings override environment variables. Environment variables override built-in defaults.
- Request normalization defaults omitted OCR backend selection to `ocrBackend=auto`, local executable settings, and defaults for local OCR flags.
