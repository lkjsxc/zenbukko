# Material Pipeline

## Purpose

Define how lesson material pages become durable local artifacts.

## Inputs

- Reference page URLs from NNN lesson metadata.
- Authenticated request headers.
- Existing material directory contents from previous runs.

## Steps

1. Fetch each reference page and save it as `reference_*.html`.
2. Extract likely material URLs from `href`, `src`, and absolute URL text.
3. Download each material into `assets/` with a stable hash-based file name.
4. Build an in-memory `materials_manifest.json` model.
5. Normalize supported reference pages and assets into PDFs under `pdf/`.
6. Write `materials_manifest.json` with source files, PDF outputs, and conversion status.
7. Write `index.html` for offline inspection.
8. If OCR is requested, discover PDFs from the manifest and run Gemini OCR.

## Outputs

- `reference_*.html`: saved source reference pages.
- `assets/*`: downloaded source assets.
- `pdf/*.pdf`: normalized OCR source PDFs.
- `materials_manifest.json`: structured manifest.
- `index.html`: offline browser entrypoint.

## Failure Behavior

Reference page fetch failures are recorded through logs and do not stop unrelated lessons. Unsupported asset formats remain in `assets/`, receive a skipped conversion status, and are not sent to OCR.
