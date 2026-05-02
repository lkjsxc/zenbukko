# OCR Pipeline

## Purpose

Define how normalized PDFs become Markdown outputs.

## Steps

1. Refresh material PDFs from any discovered `materials_manifest.json`.
2. Discover PDFs from manifest `pdfs` entries.
3. Fall back to recursive `.pdf` discovery only when no manifest PDFs exist.
4. Build OCR tasks and skip existing Markdown only when it is newer than the source PDF unless `force` is true.
5. Reject oversized PDFs before network calls.
6. Execute Batch or Flex according to the OCR plan.
7. Normalize Gemini Markdown responses.
8. Write one `*_ocr.md` per PDF.
9. Write `materials_ocr.md` aggregate and `materials_ocr_manifest.json`.

## Inputs

- Normalized PDF files.
- Gemini API key.
- Model, mode, tier, retry, and timeout settings.

## Failure Behavior

One failed PDF must not erase successful Markdown from other PDFs. The manifest records skipped, written, and failed entries.
