# OCR Manifest Schema

## Purpose

`materials_ocr_manifest.json` records OCR execution and output state.

## Top-Level Fields

- `generatedAt`: ISO timestamp.
- `ocrBackend`: selected OCR backend.
- `model`: OCR model name for cloud backends.
- `requestedMode`: requested OCR mode.
- `plannedMode`: selected execution mode.
- `serviceTier`: cloud service tier.
- `pdfs`: discovered source PDF paths.
- `results`: per-PDF result records.
- `aggregatePath`: optional aggregate Markdown path.

## Result Record

- `pdfPath`: source PDF.
- `markdownPath`: optional Markdown output.
- `status`: `written`, `skipped`, `failed`, or `localUnavailable`.
- `message`: optional reason.
- `mode`: optional cloud execution mode.
- `batchJobName`: optional cloud batch job name.
