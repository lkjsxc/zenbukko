# Verification

## Purpose

Commands used before declaring the upgrade complete.

## Docker

```sh
docker compose config
docker compose --profile gpu config --services
docker compose build zenbukko
docker compose run --rm --entrypoint /bin/sh zenbukko -c 'command -v ndlocr-lite; command -v pdftoppm'
docker compose run --rm --entrypoint npm zenbukko run type-check
docker compose run --rm --entrypoint npm zenbukko run lint
docker compose run --rm --entrypoint npm zenbukko run test
docker compose run --rm --entrypoint npm zenbukko run check:lines
docker compose --profile gpu build zenbukko-gpu
```

## Local

```sh
npm run type-check
npm run lint
npm test
npm run check:lines
```

## Data Backfill

```sh
docker compose run --rm zenbukko rebuild-chapter-ocr --input /data/downloads
```

## Notes

If CUDA runtime is unavailable, record that only the GPU image build was verified.
