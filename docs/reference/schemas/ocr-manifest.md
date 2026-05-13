# OCR Manifest Schema

## Purpose

`materials_ocr_manifest.json` records OCR execution and output state.

## Top-Level Fields

- `generatedAt`: ISO timestamp.
- `ocrBackend`: selected OCR backend.
- `model`: OCR model name for Gemini runs.
- `requestedMode`: requested OCR mode.
- `plannedMode`: selected execution mode.
- `serviceTier`: cloud service tier.
- `pdfs`: discovered source PDF paths.
- `results`: per-PDF result records.
- `aggregatePath`: optional aggregate Markdown path.

## Result Record

- `pdfPath`: source PDF.
- `markdownPath`: optional Markdown output.
- `status`: `written`, `skipped`, or `failed`.
- `message`: optional reason.
- `finalBackend`: optional backend that produced the result.
- `mode`: optional execution mode.
- `batchJobName`: optional cloud batch job name.
- `attempts`: optional ordered backend attempts for `ocrBackend=auto`.
