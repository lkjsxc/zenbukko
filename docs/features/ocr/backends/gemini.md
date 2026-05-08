# Gemini Backend

## Purpose

Document cloud OCR behavior when the selected backend is Google Gemini.

## Requirements

- `GEMINI_API_KEY` is required for cloud execution.
- `GEMINI_MODEL` selects the model; default remains `gemini-3.1-flash-lite`.

## Modes

- `auto`: batch planning applies when meaningful multi-PDF work exists; otherwise flex.
- `batch`: uses cloud files and batch OCR.
- `flex`: uses synchronous OCR with `serviceTier` and retries.

## Service Tier

- `flex`: default cloud tier.
- `standard`: explicitly requested recovery mode.

## Failure Behavior

- Batch job names and per-PDF rejection reasons are captured in the manifest.
- Failures in batch mode can retry through flex mode.
