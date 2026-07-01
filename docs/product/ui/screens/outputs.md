# Outputs Screen

## Purpose

Browse, filter, preview, and download generated artifacts.

## Inputs

- `GET /api/outputs`
- `GET /api/outputs/content?path=` for preview
- `GET /api/outputs/download?path=` for download

## Outputs

- Filter chips: All, Markdown, Transcripts, PDF, JSON, HTML.
- Split view: file list + preview pane.

## Invariants

Paths displayed relative to output root. PDF shows metadata + download only.

## Failure Behavior

Preview failures show toast. Path validation errors return 400 from API.
