# Local OCR Runner

## Purpose

Describe the on-machine OCR path used by every OCR job.

## Behavior

- Input: PDFs produced by material normalization or discovered in a local input tree.
- Rasterization: `pdftoppm` renders each PDF page to images.
- Text extraction: NDLOCR-Lite reads the page image directory and writes local text output.
- Device: `cpu` by default; `cuda` only when the installed local runner and host support it.
- Output: per-PDF Markdown, lesson aggregate, chapter aggregate, and manifest.

## Settings

- `ndlocrCommand`: executable name or absolute path.
- `ndlocrDevice`: `cpu` or `cuda`.
- `ocrPageDpi`: Poppler rasterization DPI.
- `ocrKeepIntermediates`: retain page images and raw text outputs.
- `ndlocrEnableTcy`: enable tate-chu-yoko handling when supported.

## Quality Gates

- Deterministic output from the same PDF input and local tool versions.
- No external network required for success.
- Docker-gated OCR smoke checks verify local OCR wiring before Docker OCR readiness is claimed.

## Failure Behavior

- Missing `pdftoppm` or OCR command fails preflight with an actionable diagnostic.
- Unreadable PDFs are reported as file-processing failures.
- Empty OCR output is a failed result, not invented content.
- OCR failures are captured in manifest status and do not delete other outputs.
