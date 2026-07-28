# Report Prompts

## Purpose

Build reusable report-writing prompts from downloaded course materials,
OCR output, and voice transcripts.

## Files

- [`assignments.md`](assignments.md): report assignment capture during download.
- [`builder.md`](builder.md): source discovery and CLI behavior.
- [`template.md`](template.md): prompt structure and topic placeholder.

## Invariants

- Report prompt generation never creates a final report body.
- The report topic may be supplied by the user or left as `{{REPORT_TOPIC}}`.
- OCR, transcript, and report-assignment text are copied from existing local artifacts only.
- Missing source kinds are allowed when at least one source exists.
