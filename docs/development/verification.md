# Verification

## Purpose

Commands used before declaring an upgrade complete.

## Local npm

```sh
npm ci
npm --prefix web-ui ci
npm run type-check
npm run lint
npm test
npm run check:lines
npm run build
node dist/index.js doctor
```

## Local pnpm

Use this path when npm is unavailable. Build scripts themselves are package-manager neutral.

```sh
pnpm install --no-lockfile
pnpm run type-check
pnpm run lint
pnpm test
pnpm run check:lines
pnpm run build
node dist/index.js doctor
```

`doctor` may exit non-zero when optional local OCR or transcription dependencies are not installed. Record each failed check rather than claiming that feature is ready.

## Windows Native

Run the local commands in PowerShell using Node.js 22 or newer. Verify the path contract tests, browser resolution tests, auth input cleanup tests, production build, `/healthz`, Web `/`, and course listing when a private session is already present. Never copy session data into test output.

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
node dist/index.js api --port 8788
# In another terminal:
node dist/index.js web --port 8787
```

Open `http://127.0.0.1:8787/`, verify `/healthz`, and verify all navigation routes. Do not start archive, OCR, transcription, or bulk-download jobs without explicit operator approval.

## Data Backfill

```sh
docker compose run --rm zenbukko-api rebuild-chapter-ocr --input /data/downloads
```

Run backfills only against an explicitly selected data directory.
