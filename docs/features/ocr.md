# OCR

## Purpose

Convert PDF materials into faithful Markdown using Gemini.

## Inputs

- PDF files discovered from material manifests or recursive scan.
- Gemini API key from web settings or environment.
- `geminiModel`, `ocrMode`, `ocrServiceTier`, retry count, and timeout settings.

## Modes

- `auto`: Batch for multi-PDF/background work; Flex for single/small work and Batch recovery.
- `batch`: Gemini Batch API with inline requests over uploaded PDF file URIs.
- `flex`: synchronous Gemini request with `serviceTier: "flex"` unless Standard is selected.

## Outputs

- One `*_ocr.md` file per PDF.
- `materials_ocr.md` aggregate.
- `materials_ocr_manifest.json` with model, mode, tier, source PDFs, per-PDF status, batch job name, output paths, errors, and timestamps.

## Failure Behavior

Batch item failures retry through Flex. Standard tier is used only when explicitly selected.
