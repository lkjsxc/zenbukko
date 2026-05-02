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

- `sourceFile`: source file relative to the material directory.
- `pdfFile`: PDF file relative to the material directory.
- `kind`: `source-pdf`, `html`, `image`, or `text`.
- `status`: `ready`, `skipped`, or `failed`.
- `message`: optional human-readable reason.

## Invariants

`pdfs` is the authoritative OCR source list when present. Duplicate `pdfFile` entries are ignored by OCR discovery.
