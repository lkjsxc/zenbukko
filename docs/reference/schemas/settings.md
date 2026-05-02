# Settings Schema

## Purpose

Browser settings persist operator preferences under `/data/web/settings.json`.

## Fields

- `geminiApiKey`: optional Gemini key.
- `geminiModel`: Gemini OCR model, default `gemini-3-flash-preview`.
- `ocrMode`: `auto`, `batch`, or `flex`.
- `ocrServiceTier`: `flex` or `standard`.
- `chapterRange`: one-based chapter ordinal range expression.
- `ocrRetries`: retry count for Flex recovery.
- `ocrTimeoutMs`: timeout for Gemini OCR calls.

## Precedence

Web settings override environment variables. Environment variables override built-in defaults.
