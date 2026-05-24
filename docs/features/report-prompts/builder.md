# Report Prompt Builder

## Inputs

- `--input` accepts a downloads, course, chapter, lesson, or material directory.
- Existing OCR inputs are `chapter-<chapterId>_ocr.md` first, then
  `materials_ocr.md` fallback files.
- Existing transcript inputs are `chapter-<chapterId>_transcription.md` first,
  then lesson-level `*_transcription.txt` fallback files.
- The user may pass `--topic`; otherwise the prompt keeps `{{REPORT_TOPIC}}`.

## Output

- The default output is `report_prompt.md` inside the input directory.
- `--output` may write to another path.
- The output prompt includes source paths, OCR material text, transcript text,
  and report-writing rules.

## Failure Behavior

- The command fails when no OCR or transcript sources are found.
- The command fails before writing if the output path cannot be created.
- The command does not run OCR, transcription, download, or an LLM.
