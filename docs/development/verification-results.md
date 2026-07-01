# Verification Results

## Date

July 1, 2026.

## Local

- `npm run type-check`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 43 tests.
- `npm run check:lines`: passed.
- `npm run build`: passed.

## Docker CPU

- `docker compose config`: passed.
- `docker compose --profile cpu build zenbukko-api zenbukko-web`: passed.
- `docker compose --profile cpu run --rm --entrypoint npm zenbukko-api run smoke:local-ocr`: passed.

## Smoke Details

- The local OCR smoke generated material PDFs from synthetic reference content.
- The smoke wrote per-PDF OCR Markdown, `materials_ocr.md`, and `materials_ocr_manifest.json`.
- The smoke rebuilt `chapter-777_ocr.md`.
- The smoke asserted manifest runner, command, device, preflight, and written result details.

## Host-Dependent Gates

GPU Docker gates were not run because this host does not expose `nvidia-smi`. Run them only on a Linux NVIDIA CUDA host.
