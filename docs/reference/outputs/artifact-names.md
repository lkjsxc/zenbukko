# Artifact Names

## OCR

- `*_ocr.md`: one Markdown file per normalized PDF.
- `materials_ocr.md`: lesson-level aggregate inside each `*_materials` directory.
- `materials_ocr_manifest.json`: per-run OCR status.
- `chapter-<chapterId>_ocr.md`: chapter-level aggregate in chapter folders.

## Materials And Transcripts

- `reference_*.html`: captured material index pages.
- `pdf/*.pdf`: normalized PDF inputs.
- `materials_manifest.json`: material capture and conversion state.
- `index.html`: offline material browser entrypoint.
- `chapter-<chapterId>_transcription.md`: chapter-level transcript aggregate.

## Report Prompts

- `report_prompt.md`: prompt built from OCR and transcript artifacts.
