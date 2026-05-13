# OCR Smoke

## Docker Gate

OCR smoke checks that depend on packaged binaries are Docker-gated. They should run only after the relevant Docker image is built and the test input is mounted into `/data`.

## Local OCR

- CPU services must expose `ndlocr-lite` and Poppler tools.
- GPU services must expose NDLOCR CUDA execution when an NVIDIA runtime is available.
- Smoke output must include per-PDF Markdown, `materials_ocr.md`, and `materials_ocr_manifest.json`.
