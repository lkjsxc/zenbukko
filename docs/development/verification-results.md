# Verification Results

## Date

May 8, 2026.

## Local

- `npm run type-check`: passed.
- `npm run lint`: passed.
- `npm test`: passed.
- `npm run check:lines`: passed.

## Docker

- `docker compose config`: passed.
- `docker compose --profile gpu config --services`: passed.
- `docker compose build zenbukko`: passed, including CPU whisper.cpp build, model download, Poppler, and NDLOCR-Lite install.
- `docker compose run --rm --entrypoint /bin/sh zenbukko -c 'command -v ndlocr-lite; command -v pdftoppm; ndlocr-lite --help | head -35'`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run type-check`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run lint`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run test`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run check:lines`: passed.

## Data Backfill

- `docker compose run --rm zenbukko rebuild-chapter-ocr --input /data/downloads`: passed.
- Wrote 20 ignored local `chapter-<chapterId>_ocr.md` files across the current downloaded data.
- Sample output uses `## NN lesson-<lessonId>` sections and demoted OCR headings.

## Not Verified

The GPU image was not rebuilt after the local OCR packaging change. CUDA runtime execution was not verified.
