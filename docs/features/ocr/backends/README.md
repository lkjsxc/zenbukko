# OCR Backends

## Purpose

Define OCR provider behavior without tying feature contracts to a single vendor.

## Contract

- Backends are selected by policy:
  - `local` is preferred by default.
  - `gemini` is the documented cloud fallback.
- Output contracts remain the same (`*_ocr.md`, lesson aggregate, chapter aggregate, manifest).
- Manifest entries describe the active backend for each run.

## Files

- [`local.md`](local.md): local backend contract and behavior.
- [`gemini.md`](gemini.md): cloud backend execution details.

## Invariants

- Local-first selection happens before local outputs are returned.
- A missing local backend should not change file layout; it changes backend selection only.
- Backend switches do not change manifest field names or required output paths.
