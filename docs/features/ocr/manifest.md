# OCR Manifest

## Purpose

Record what OCR attempted and what it produced.

## Fields

- `generatedAt`: ISO timestamp.
- `model`: Gemini model name.
- `requestedMode`: requested OCR mode.
- `plannedMode`: actual plan mode.
- `serviceTier`: requested service tier.
- `pdfs`: absolute PDF paths discovered for OCR.
- `results`: per-PDF status entries.
- `aggregatePath`: optional aggregate Markdown path.

## Result Status

- `written`: Markdown was written in this run.
- `skipped`: Markdown already existed or the source was rejected before OCR.
- `failed`: Gemini or file processing failed.

## Invariants

Every result includes `pdfPath`. Written results include `markdownPath` and execution `mode`.
