# Materials Manifest

## Purpose

Describe saved material sources, PDF conversion outcomes, and OCR eligibility.

## Shape

`materials_manifest.json` contains:

- `generatedAt`: ISO timestamp for the run.
- `referencePages`: saved reference pages with source URL, local HTML file, and PDF conversion fields.
- `assets`: downloaded assets with source page URL, asset URL, local source file, and PDF conversion fields.
- `pdfs`: normalized PDF entries used by OCR discovery.

## PDF Entry Fields

- `sourceFile`: portable `/`-separated source path relative to the material directory.
- `pdfFile`: portable `/`-separated PDF path relative to the material directory.
- `kind`: `source-pdf`, `html`, `image`, or `text`.
- `status`: `ready`, `skipped`, or `failed`.
- `message`: optional human-readable reason.

## Invariants

`pdfs` is the authoritative OCR source list when present. Duplicate `pdfFile` entries are ignored by OCR discovery. Relative manifest paths must remain inside the material directory when resolved.
