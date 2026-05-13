# OCR

## Purpose

OCR converts normalized material PDFs into Markdown using a configurable backend.

## Files

- [`pipeline.md`](pipeline.md): OCR discovery, planning, execution, and output writing.
- [`backends/`](backends/README.md): OCR backend strategy and backend-specific modes.
- [`quality/`](quality/README.md): OCR quality gates and smoke checks.
- [`chapter-aggregation.md`](chapter-aggregation.md): chapter-level OCR text contract.
- [`manifest.md`](manifest.md): OCR result manifest contract.

## Invariants

- OCR receives PDFs only.
- Material directories use `materials_manifest.json` PDF entries before recursive PDF fallback.
- Standalone OCR refreshes manifest-backed material PDFs before discovery.
- `ocrBackend=auto|local|gemini`; the default is `auto`.
- `auto` uses local OCR first, then Gemini recovery when configured.
- `ocrMode` controls only Gemini planning, not local OCR.
- Local backends ignore Gemini-only settings and return deterministic local error codes.
- Gemini can use batch or synchronous mode and recover through fallback unless standard execution is explicitly requested.
- Each lesson material directory writes `materials_ocr.md`.
- Each chapter directory writes `chapter-<chapterId>_ocr.md` by concatenating lesson OCR aggregates in lesson order.
