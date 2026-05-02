# OCR Manifest Schema

## Purpose

`materials_ocr_manifest.json` records OCR execution and output state.

## Top-Level Fields

- `generatedAt`: ISO timestamp.
- `model`: Gemini model.
- `requestedMode`: requested OCR mode.
- `plannedMode`: selected execution mode.
- `serviceTier`: Gemini service tier.
- `pdfs`: discovered source PDF paths.
- `results`: per-PDF result records.
- `aggregatePath`: optional aggregate Markdown path.

## Result Record

- `pdfPath`: source PDF.
- `markdownPath`: optional Markdown output.
- `status`: `written`, `skipped`, or `failed`.
- `message`: optional reason.
- `mode`: optional Gemini execution mode.
- `batchJobName`: optional Batch API job name.
