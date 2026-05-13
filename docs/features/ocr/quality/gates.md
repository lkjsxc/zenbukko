# OCR Quality Gates

## Required Checks

- At least one normalized PDF is discovered from `materials_manifest.json` or fallback scanning.
- Each attempted PDF has a result row in `materials_ocr_manifest.json`.
- Successful rows write Markdown at the recorded path.
- Lesson and chapter aggregates are rebuilt when source layout supports them.

## Skips

Skipped files must preserve source context and a readable reason in the manifest.
