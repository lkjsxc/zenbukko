# Verification Results

## Date

May 2, 2026.

## Local

- `npm run type-check`: passed.
- `npm run lint`: passed.
- `npm test`: passed.
- `npm run check:lines`: passed.

## Docker

- `docker compose config`: passed.
- `docker compose build zenbukko`: passed, including CPU whisper.cpp build and model download.
- `docker compose run --rm --entrypoint npm zenbukko run type-check`: passed.
- `docker compose run --rm --entrypoint npm zenbukko run lint`: passed.
- `docker compose run --rm --entrypoint npm zenbukko test`: passed.
- `docker compose --profile gpu build zenbukko-gpu`: passed, including CPU and CUDA whisper.cpp builds and model download.

## Not Verified

CUDA runtime execution was not verified. The GPU image build passed, but no GPU transcription job was run.
