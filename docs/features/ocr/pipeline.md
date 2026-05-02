# OCR Pipeline

## Purpose

Define how normalized PDFs become Markdown outputs.

## Steps

1. Discover PDFs from `materials_manifest.json` `pdfs` entries.
2. Fall back to recursive `.pdf` discovery only when no manifest PDFs exist.
3. Build OCR tasks and skip existing Markdown unless `force` is true.
4. Reject oversized PDFs before network calls.
5. Execute Batch or Flex according to the OCR plan.
6. Normalize Gemini Markdown responses.
7. Write one `*_ocr.md` per PDF.
8. Write `materials_ocr.md` aggregate and `materials_ocr_manifest.json`.

## Inputs

- Normalized PDF files.
- Gemini API key.
- Model, mode, tier, retry, and timeout settings.

## Failure Behavior

One failed PDF must not erase successful Markdown from other PDFs. The manifest records skipped, written, and failed entries.
