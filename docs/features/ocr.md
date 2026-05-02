# OCR Legacy Pointer

## Purpose

This file is retained as a short pointer. The authoritative OCR specification is [`ocr/`](ocr/README.md).

## Required Behavior

- Discover normalized PDFs from `materials_manifest.json`.
- Use Gemini Batch and Flex according to configured mode.
- Write one Markdown file per PDF plus aggregate Markdown.
- Record model, mode, tier, source PDFs, output paths, and errors.

## Files

- [`ocr/pipeline.md`](ocr/pipeline.md)
- [`ocr/gemini-modes.md`](ocr/gemini-modes.md)
- [`ocr/manifest.md`](ocr/manifest.md)
