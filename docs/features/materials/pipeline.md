# Material Pipeline

## Purpose

Define how lesson material pages become durable local artifacts.

## Inputs

- Reference page URLs from NNN lesson metadata.
- Authenticated request headers.
- Existing material directory contents from previous runs.

## Steps

1. Build the selected lesson work list before downloading media.
2. For each selected lesson, fetch reference pages and save them as `reference_*.html`.
3. Extract likely material URLs from `href`, `src`, and absolute URL text.
4. Download each material into `assets/` with a stable hash-based file name.
5. Build an in-memory `materials_manifest.json` model.
6. Normalize supported reference pages and assets into PDFs under `pdf/`.
7. Write `materials_manifest.json` with source files, PDF outputs, and conversion status.
8. Write `index.html` for offline inspection.
9. After all selected lesson material directories are present, continue with media, transcription, and local OCR.

## Outputs

- `reference_*.html`: saved source reference pages.
- `assets/*`: downloaded source assets.
- `pdf/*.pdf`: normalized OCR source PDFs.
- `materials_manifest.json`: structured manifest.
- `index.html`: offline browser entrypoint.

## Failure Behavior

Reference page fetch failures are recorded through logs and do not stop unrelated lessons. Unsupported asset formats remain in `assets/`, receive a skipped conversion status, and are not sent to OCR.

## Invariants

- Material capture must not be blocked by OCR or transcription for a previous lesson.
- The first visible success signal for a large job is the full set of selected lesson material directories.
- OCR consumes the material directories after capture, so slow local processing cannot hide missing later materials.
