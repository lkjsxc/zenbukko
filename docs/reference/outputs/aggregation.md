# Output Aggregation

## Lesson Aggregates

`materials_ocr.md` combines successful per-PDF OCR output for one lesson material directory.

## Chapter Aggregates

`chapter-<chapterId>_ocr.md` concatenates lesson OCR aggregates in lesson order. `chapter-<chapterId>_transcription.md` does the same for lesson transcripts.

## Invariants

- Aggregates are append-safe.
- Rebuild commands are idempotent for existing local data.
- Aggregate files contain plain Markdown and no binary payload.
