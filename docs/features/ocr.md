# OCR

## Purpose

Define OCR contracts independent of any one OCR provider.

## Required Behavior

- Discover normalized PDFs from `materials_manifest.json`.
- Select OCR backend by default policy (`local` preferred, `cloud` fallback).
- Write one Markdown file per PDF, one lesson aggregate, and chapter aggregates.
- Record backend, mode, tier (when applicable), source PDFs, output paths, and errors.
- Keep manifest and output contracts stable across backends.

## Files

- [`ocr/pipeline.md`](ocr/pipeline.md): planning, execution, and artifact writes.
- [`ocr/backends/`](ocr/backends/README.md): backend routing and backend-specific behavior.
- [`ocr/chapter-aggregation.md`](ocr/chapter-aggregation.md): chapter-level text output.
- [`ocr/manifest.md`](ocr/manifest.md): run result contract.
