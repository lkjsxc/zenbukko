# Verification Results

## Date

May 14, 2026.

## Local

- `npm run type-check`: passed.
- `npm run lint`: passed.
- `npm test`: passed.
- `npm run check:lines`: passed.

## Docker

- `docker compose config --quiet`: passed.
- `docker compose --profile gpu config --services`: passed.
- `docker compose build zenbukko`: passed.
- `docker compose --profile gpu build zenbukko-gpu zenbukko-web-gpu`: passed.
- `docker compose run --rm --entrypoint /bin/sh zenbukko -c 'command -v ndlocr-lite; command -v pdftoppm; command -v chromium'`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run type-check`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run lint`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run test`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run check:lines`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run smoke:local-ocr`: passed.

## Smoke Details

- The local OCR smoke generated a synthetic PDF under `/tmp`.
- The smoke covered material OCR and chapter OCR writes.
- The smoke confirmed the TCY retry path after NDLOCR-Lite reported a missing `tcy_wrapper` module.

## Not Verified

CUDA runtime execution against a physical GPU was not exercised in this run.
