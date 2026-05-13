# OCR Backends

## Purpose

Define OCR provider behavior without tying feature contracts to a single vendor.

## Contract

- Backends are selected with `ocrBackend=auto|local|gemini`.
- The default is `auto`.
- `auto` tries local OCR first and uses Gemini only when recovery is configured.
- `ocrMode` applies only to Gemini planning.
- Output contracts remain the same (`*_ocr.md`, lesson aggregate, chapter aggregate, manifest).
- Manifest entries describe the active backend for each run.

## Files

- [`local.md`](local.md): local backend contract and behavior.
- [`gemini.md`](gemini.md): cloud backend execution details.

## Invariants

- Local-first selection happens before local outputs are returned.
- A missing local backend should not change file layout; it changes backend selection only.
- Backend switches do not change manifest field names or required output paths.
