# Local OCR Backend

## Purpose

Describe the on-machine OCR path intended to be the default behavior.

## Behavior

- Input: PDF files produced by material normalization.
- Execution: in the same process or local worker queue.
- Output: identical Markdown and manifest fields as cloud backends.
- Failure mode: if local OCR is unavailable, the backend selection falls back to cloud when configured.

## Quality Gates

- Deterministic output from the same PDF input.
- No external network required for success.
- No cloud API key required.

## Failure Behavior

- Unreadable PDFs are reported as file-processing failures.
- OCR failures are captured in manifest status and do not delete other outputs.
