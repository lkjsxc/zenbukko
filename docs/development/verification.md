# Verification

## Purpose

Commands used before declaring the upgrade complete.

## Local

```sh
npm run type-check
npm run lint
npm test
npm run check:lines
npm run build
```

## Docker CPU

```sh
docker compose config
docker compose --profile cpu build zenbukko-api zenbukko-web
docker compose --profile cpu run --rm --entrypoint npm zenbukko-api run smoke:local-ocr
```

CPU Docker gates verify local OCR and local transcription dependencies packaged in the CPU image.

## Docker GPU

Run only on a Linux NVIDIA host with NVIDIA Container Toolkit:

```sh
docker compose --profile gpu config
docker compose --profile gpu build zenbukko-api-gpu zenbukko-web-gpu
docker compose --profile gpu run --rm --entrypoint npm zenbukko-api-gpu run smoke:local-ocr
```

Record GPU results separately from CPU results. Missing NVIDIA hardware is host-dependent.

## Web UI Smoke

```sh
npm run build
zenbukko api --port 8788 &
zenbukko web --port 8787 &
# Open http://127.0.0.1:8787/ and verify all nav routes render.
```

## Data Backfill

```sh
docker compose run --rm zenbukko-api rebuild-chapter-ocr --input /data/downloads
```

## Notes

If CUDA runtime is unavailable, record that CPU and image configuration were verified and local CUDA execution was not run.
