# Local OCR Runner

## Purpose

Define the only supported OCR execution path.

## Contract

- OCR is local-only.
- The runner uses local PDFs, Poppler `pdftoppm`, and NDLOCR-Lite.
- Output contracts remain `*_ocr.md`, lesson aggregate, chapter aggregate, and manifest.
- Manifest entries describe local command, device, page DPI, diagnostics, and artifacts.

## Files

- [`local.md`](local.md): local runner behavior and failure handling.

## Invariants

- A missing local executable is reported as a local preflight failure.
- File layout is stable regardless of local execution success.
- No OCR setting accepts remote model names, API keys, or provider mode names.
