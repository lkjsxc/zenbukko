# OCR

## Purpose

OCR converts normalized material PDFs into Markdown using local tools only.

## Files

- [`pipeline.md`](pipeline.md): discovery, planning, local execution, and output writing.
- [`backends/`](backends/README.md): local OCR runner contract.
- [`quality/`](quality/README.md): OCR quality gates and smoke checks.
- [`chapter-aggregation.md`](chapter-aggregation.md): chapter-level OCR text contract.
- [`manifest.md`](manifest.md): OCR result manifest contract.

## Invariants

- OCR receives PDFs only.
- PDFs are read from local disk and never leave the machine or container for OCR.
- Material directories use `materials_manifest.json` PDF entries before recursive PDF fallback.
- Standalone OCR refreshes manifest-backed material PDFs before discovery.
- Local OCR uses Poppler `pdftoppm` and the configured NDLOCR-Lite command.
- Local settings are command path, device, page DPI, intermediate retention, and tate-chu-yoko handling.
- Each lesson material directory writes `materials_ocr.md` and `materials_ocr_manifest.json`.
- Each chapter directory writes `chapter-<chapterId>_ocr.md` by concatenating lesson OCR aggregates in lesson order.

## Failure Behavior

One failed PDF must not erase successful Markdown from other PDFs. The manifest records skipped, written, and failed entries with actionable local diagnostics.
