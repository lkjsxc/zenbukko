# Verification

## Purpose

Commands used before declaring the upgrade complete.

## Docker

```sh
docker compose config
docker compose --profile cpu config --services
docker compose --profile gpu config --services
docker compose build zenbukko-api zenbukko-web
docker compose run --rm --entrypoint /bin/sh zenbukko-api -c 'command -v ndlocr-lite; command -v pdftoppm'
docker compose run --rm --entrypoint npm zenbukko-api run type-check
docker compose run --rm --entrypoint npm zenbukko-api run lint
docker compose run --rm --entrypoint npm zenbukko-api run test
docker compose run --rm --entrypoint npm zenbukko-api run check:lines
docker compose --profile gpu build zenbukko-api-gpu zenbukko-web-gpu
```

Docker-gated OCR smoke checks must run from a built image with sample input mounted under `/data`.

## Local

```sh
npm run type-check
npm run lint
npm test
npm run check:lines
```

## Data Backfill

```sh
docker compose run --rm zenbukko-api rebuild-chapter-ocr --input /data/downloads
```

## Notes

If CUDA runtime is unavailable, record that only the GPU image build was verified and NDLOCR CUDA execution was not verified.
