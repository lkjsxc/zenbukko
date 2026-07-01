# OCR Pipeline

## Purpose

Define how normalized PDFs become Markdown outputs through local OCR.

## Steps

1. Refresh material PDFs from any discovered `materials_manifest.json`.
2. Discover PDFs from manifest `pdfs` entries.
3. Fall back to recursive `.pdf` discovery only when no manifest PDFs exist.
4. Build OCR tasks and skip existing Markdown only when it is newer than the source PDF unless `force` is true.
5. Reject oversized PDFs before execution.
6. Run local preflight for Poppler and the configured OCR command.
7. If preflight fails, record a failed result for each runnable PDF.
8. Rasterize PDFs to page images with `pdftoppm`.
9. Run NDLOCR-Lite over page images with the configured device and TCY setting.
10. Normalize local OCR text to Markdown.
11. Write one `*_ocr.md` per PDF.
12. Write lesson-level `materials_ocr.md` and `materials_ocr_manifest.json`.
13. Rebuild chapter-level `chapter-<chapterId>_ocr.md` when the input is inside a standard course layout.

## Inputs

- Normalized PDF files.
- Local OCR command path.
- Local OCR device: `cpu` or `cuda`.
- PDF page DPI.
- Intermediate retention flag.
- Tate-chu-yoko handling flag.

## Failure Behavior

One failed PDF must not erase successful Markdown from other PDFs. The manifest records skipped, written, and failed entries.

Chapter aggregation is best-effort. Missing lesson aggregates are logged and skipped so completed OCR remains usable.
