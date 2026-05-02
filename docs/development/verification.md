# Verification

## Purpose

Commands used before declaring the upgrade complete.

## Docker

```sh
docker compose config
docker compose build zenbukko
docker compose run --rm --entrypoint npm zenbukko run type-check
docker compose run --rm --entrypoint npm zenbukko run lint
docker compose run --rm --entrypoint npm zenbukko test
docker compose --profile gpu build zenbukko-gpu
```

## Local

```sh
npm run type-check
npm run lint
npm test
npm run check:lines
```

## Notes

If CUDA runtime is unavailable, record that only the GPU image build was verified.
