# Report Prompt Template

## Structure

The generated prompt contains:

- Course name or `{{COURSE_NAME}}`.
- Report topic or `{{REPORT_TOPIC}}`.
- Source path list.
- `<ocr-materials>` block when OCR text exists.
- `<voice-transcripts>` block when transcript text exists.
- Output rules that require a report body only.

## Writing Contract

- The report topic from the submission page is the highest priority.
- The generated report must not add facts outside the prompt sources.
- If sources are too thin for the topic, the model should say that the report
  cannot be written from the available information.
- The default style is polite Japanese prose.
