# OCR Pipeline

## Purpose

Define how normalized PDFs become Markdown outputs, independent of provider.

## Steps

1. Refresh material PDFs from any discovered `materials_manifest.json`.
2. Discover PDFs from manifest `pdfs` entries.
3. Fall back to recursive `.pdf` discovery only when no manifest PDFs exist.
4. Build OCR tasks and skip existing Markdown only when it is newer than the source PDF unless `force` is true.
5. Reject oversized PDFs before backend execution.
6. Select backend:
   - default: local-first,
   - fallback: cloud when local backend is unavailable.
7. Execute backend-specific mode:
   - local: synchronous local execution,
   - cloud: Batch or Flex according to mode and tier.
8. Normalize backend OCR Markdown responses.
9. Write one `*_ocr.md` per PDF.
10. Write lesson-level `materials_ocr.md` and `materials_ocr_manifest.json`.
11. Rebuild chapter-level `chapter-<chapterId>_ocr.md` when the input is inside a standard course layout.

## Inputs

- Normalized PDF files.
- OCR backend selection and preference.
- Cloud OCR credentials, model, mode, tier, retry, and timeout settings when applicable.

## Failure Behavior

One failed PDF must not erase successful Markdown from other PDFs. The manifest records skipped, written, and failed entries.

Chapter aggregation is best-effort. Missing lesson aggregates are logged and skipped so completed OCR remains usable.
