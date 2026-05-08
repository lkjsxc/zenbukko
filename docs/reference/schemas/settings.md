# Settings Schema

## Purpose

Browser settings persist operator preferences under `/data/web/settings.json`.

## Fields

- `ocrBackend`: `local` or `gemini` (default `local`).
- `geminiApiKey`: optional Gemini key for cloud OCR.
- `geminiModel`: cloud OCR model, default `gemini-3.1-flash-lite`.
- `ocrMode`: `auto`, `batch`, or `flex`.
- `ocrServiceTier`: `flex` or `standard`.
- `chapterRange`: one-based chapter ordinal range expression.
- `ocrRetries`: retry count for Flex recovery.
- `ocrTimeoutMs`: timeout for Gemini OCR calls.
- `ndlocrCommand`, `ndlocrDevice`, `ocrPageDpi`, `ocrKeepIntermediates`, `ndlocrEnableTcy`: local OCR knobs.

## Precedence

Web settings override environment variables. Environment variables override built-in defaults.
- Request normalization also defaults omitted fields to safe local values (`ocrBackend=local`, local executable settings, and defaults for local OCR flags).
