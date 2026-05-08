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

## Invariants

Chapter directories are stable numeric ordinals based on the full course chapter list, not on the selected subset.

Chapter OCR and transcription files are intended as the highest-level LLM input for one chapter.
