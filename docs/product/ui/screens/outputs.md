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

Paths display relative to output root. Previewability is decided from the extension before requesting content. PDF and other binary files show metadata plus download; text previews also retain a download action. Filter and selection survive preview state changes.

## Failure Behavior

List loading, preview loading, no outputs, and no filter matches have distinct states. Preview failures show inline recovery and a toast. Path validation errors return 400 from API.
