# Output Contracts

## Purpose

Track all generated artifacts with stable names and layout expectations.

## OCR Outputs

- `*_ocr.md`: one Markdown file per normalized PDF.
- `materials_ocr.md`: lesson-level aggregate inside each `*_materials` directory.
- `materials_ocr_manifest.json`: per-run OCR status.
- `chapter-<chapterId>_ocr.md`: chapter-level aggregate in chapter folders.
- `_ocr` aggregates contain plain Markdown and no binary payload.

# Non-OCR Outputs

- `reference_*.html`: captured material index pages.
- `pdf/*.pdf`: normalized PDF inputs.
- `materials_manifest.json`: per-lesson material capture and conversion state.
- `index.html`: offline material browser entrypoint.
- `chapter-<chapterId>_transcription.md`: chapter-level transcript aggregate.

## Invariants

- Artifact names are stable across runs.
- Aggregates are append-safe.
- Rebuild commands are idempotent for existing local data.
