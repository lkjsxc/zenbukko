# Settings Screen

## Purpose

Persist local OCR configuration.

## Inputs

- `GET /api/settings` on load.
- Form fields for OCR command, device, page DPI, intermediate retention, and tate-chu-yoko handling.

## Outputs

- `POST /api/settings` on save.
- Collapsible advanced section for local OCR details.

## Invariants

- Settings expose only local OCR controls.
- `chapterRange` is not a settings field exposed on Archive screen preload.
- Rendered controls must be appended to the DOM and saved when changed.

## Failure Behavior

Command and DPI validation appears inline. Save errors appear via toast without discarding edits. The action shows an in-flight state, and status pills update after successful save.
