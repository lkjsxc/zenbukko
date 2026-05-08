# OCR Manifest

## Purpose

Record what OCR attempted and what it produced.

## Fields

- `generatedAt`: ISO timestamp.
- `ocrBackend`: selected OCR backend.
- `model`: OCR model name for cloud backends.
- `requestedMode`: requested OCR mode.
- `plannedMode`: actual plan mode.
- `serviceTier`: requested cloud service tier.
- `pdfs`: absolute PDF paths discovered for OCR.
- `results`: per-PDF status entries.
- `aggregatePath`: optional aggregate Markdown path.

## Result Status

- `written`: Markdown was written in this run.
- `skipped`: Markdown already existed or the source was rejected before OCR.
- `failed`: OCR or file processing failed.
- `localUnavailable`: local backend was requested but not available.

## Invariants

Every result includes `pdfPath`. Written results include `markdownPath` and execution `mode`.
