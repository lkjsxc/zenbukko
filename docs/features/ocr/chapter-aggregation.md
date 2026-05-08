# Chapter OCR Aggregation

## Purpose

Prepare OCR text for LLM reading at the same chapter granularity as Whisper transcripts.

## Outputs

- `materials_ocr.md`: lesson-level OCR aggregate inside each `*_materials` directory.
- `chapter-<chapterId>_ocr.md`: chapter-level OCR aggregate directly under the chapter directory.

## Format

Chapter OCR Markdown mirrors chapter transcript Markdown:

- No chapter-level H1 is written.
- Each lesson section starts with `## NN lesson-title-or-id`.
- OCR text from every `materials_ocr.md` for that lesson is concatenated below the lesson heading.
- A lesson with multiple material parts concatenates those parts in stable path order.
- Empty or missing lesson OCR files are skipped and logged.

## Heading Rules

`materials_ocr.md` may contain an H1 added by the lesson OCR aggregate. Chapter aggregation removes that leading H1 before concatenation.

Remaining headings are normalized below the lesson section so the chapter file remains a readable tree:

- Source `#` and `##` headings become `###`.
- Deeper headings keep their relative structure when possible.
- Adjacent duplicate headings are collapsed.

## Backfill

`zenbukko rebuild-chapter-ocr --input <downloads-or-course-dir>` rebuilds chapter OCR files from existing local `materials_ocr.md` files without calling OCR backends or NNN.

The command infers chapter IDs from material manifest reference URLs. If a manifest does not expose a chapter ID, it can fall back to an existing `chapter-*_transcription.md` file in the chapter directory.

## Failure Behavior

A malformed manifest, missing OCR file, or empty OCR body does not stop unrelated chapters. The command writes a chapter file only when at least one non-empty lesson section exists.
