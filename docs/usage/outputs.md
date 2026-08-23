# Outputs

## Purpose

Describe generated file layout and expected artifacts.

## Course Layout

```text
downloads/
  course-12345/
    01/
      chapter-11111_ocr.md
      chapter-11111_transcription.md
      chapter-11111_confirmation_tests.json
      chapter-11111_report_assignments.md
      lesson-67890.ts
      lesson-67890_transcription.txt
      lesson-67890_materials/
        index.html
        materials_manifest.json
        materials_ocr.md
        materials_ocr_manifest.json
        assets/
```

## File Types

- `.ts`: downloaded HLS media.
- `.wav`: extracted audio, removed after cleanup when configured.
- `_transcription.txt`, `.srt`, `.vtt`: whisper.cpp outputs.
- `index.html`: offline material index.
- `materials_manifest.json`: material source pages and downloaded assets.
- `*_ocr.md`: per-PDF OCR Markdown.
- `materials_ocr.md`: aggregate OCR Markdown.
- `materials_ocr_manifest.json`: OCR plan and result record.
- `chapter-<chapterId>_ocr.md`: chapter-level OCR text, grouped by lesson.
- `chapter-<chapterId>_transcription.md`: chapter-level Whisper text, grouped by lesson.
- `chapter-<chapterId>_confirmation_tests.json`: confirmation-test content and user-visible results for one chapter.
- `chapter-<chapterId>_report_assignments.md`: captured report instructions for one chapter.

## Invariants

Chapter directories are stable numeric ordinals based on the full course chapter list, not on the selected subset.

Chapter OCR, transcription, confirmation-test, and report-assignment files are
the highest-level offline study inputs for one chapter.
