# Settings Screen

## Purpose

Persist OCR and Gemini configuration.

## Inputs

- `GET /api/settings` on load.
- Form fields for backend, API key, model, OCR mode, NDLOCR options.

## Outputs

- `POST /api/settings` on save.
- Collapsible advanced section for NDLOCR device, DPI, intermediates, tcy.

## Invariants

`chapterRange` is not a settings field exposed on Archive screen preload.

## Failure Behavior

Save errors via toast. Status pills update after successful save.
