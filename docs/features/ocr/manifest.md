# OCR Manifest

## Purpose

Record what local OCR attempted and what it produced.

## Fields

- `generatedAt`: ISO timestamp.
- `runner`: `local`.
- `command`: OCR executable used for the run.
- `device`: `cpu` or `cuda`.
- `pageDpi`: Poppler rasterization DPI.
- `keepIntermediates`: whether page images and raw outputs were retained.
- `enableTcy`: whether tate-chu-yoko handling was requested.
- `preflight`: local readiness result and diagnostics.
- `pdfs`: absolute PDF paths discovered for OCR.
- `results`: per-PDF status entries.
- `aggregatePath`: optional aggregate Markdown path.

## Result Status

- `written`: Markdown was written in this run.
- `skipped`: Markdown already existed or the source was rejected before OCR.
- `failed`: OCR or file processing failed.

## Result Fields

Every result includes `pdfPath` and `status`. Written results include `markdownPath`, `runner`, `elapsedMs`, and page counts when known.

Failures include a readable `message` and may include `diagnosticCode`. Retained intermediate paths are recorded as `artifactDir` and `rawOutputPaths`.
