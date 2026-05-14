# Verification Results

## Date

May 14, 2026.

## Local

- `npm run type-check`: passed.
- `npm run lint`: passed.
- `npm test`: passed.
- `npm run check:lines`: passed.
- `npm run build`: passed.

## Docker

- `docker compose config --quiet`: passed.
- `docker compose --profile gpu config --services`: passed.

## Smoke Details

- The local OCR smoke generated a synthetic PDF under `/tmp`.
- The smoke covered material OCR and chapter OCR writes.
- The smoke confirmed the TCY retry path after NDLOCR-Lite reported a missing `tcy_wrapper` module.

## Not Verified

Docker image builds and Docker-run npm checks were not exercised in this split update.
CUDA runtime execution against a physical GPU was not exercised in this run.
