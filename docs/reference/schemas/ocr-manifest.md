# OCR Manifest Schema

## Purpose

`materials_ocr_manifest.json` records local OCR execution and output state.

## Top-Level Fields

- `generatedAt`: ISO timestamp.
- `runner`: `local`.
- `command`: OCR executable used.
- `device`: `cpu` or `cuda`.
- `pageDpi`: Poppler rasterization DPI.
- `keepIntermediates`: whether temporary OCR artifacts were retained.
- `enableTcy`: whether tate-chu-yoko handling was requested.
- `preflight`: local readiness object with `ok` and `diagnostics`.
- `pdfs`: discovered source PDF paths.
- `results`: per-PDF result records.
- `aggregatePath`: optional lesson aggregate Markdown path.

## Diagnostic Record

- `code`: stable local diagnostic code.
- `message`: actionable human-readable message.

## Result Record

- `pdfPath`: source PDF.
- `markdownPath`: optional Markdown output.
- `status`: `written`, `skipped`, or `failed`.
- `message`: optional reason.
- `runner`: `local` for written OCR output.
- `diagnosticCode`: optional local diagnostic code for failures.
- `elapsedMs`: local execution duration when known.
- `artifactDir`: retained intermediate directory when enabled.
- `rawOutputPaths`: retained raw text paths when enabled.
