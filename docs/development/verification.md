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

`doctor` may exit non-zero when optional local OCR, model, or transcription dependencies are absent. Record each failed check rather than claiming the feature is ready.

## Docker Configuration

```sh
docker compose config
docker compose --profile cpu config
docker compose --profile cuda config
docker compose --profile vulkan config
docker compose --profile cpu build
docker compose --profile vulkan build
```

Build CUDA where the host permits; otherwise record Compose validation and do not claim CUDA runtime verification.

## Docker OCR Smoke

```sh
docker compose --profile cpu run --rm --entrypoint npm zenbukko-api run smoke:local-ocr
docker compose --profile vulkan run --rm --entrypoint npm zenbukko-api-vulkan run smoke:local-ocr
```

OCR smoke uses synthetic content and must remain CPU-based in both images.

## Vulkan Host Gates

Only on Linux with a mapped render node and public/synthetic audio:

```sh
docker compose --profile vulkan run --rm --entrypoint /bin/sh zenbukko-api-vulkan -c 'id; vulkaninfo --summary'
docker compose --profile vulkan run --rm zenbukko-api-vulkan probe-whisper
node dist/index.js benchmark-whisper --input /selected/public-sample.wav --backend cpu --json
node dist/index.js benchmark-whisper --input /selected/public-sample.wav --backend vulkan --json
```

Verify the unprivileged user has render-node access, the intended physical device is reported, Whisper logs a Vulkan resolution, output exists, explicit Vulkan fails without the device, and `auto` falls back to CPU without it. Record host CPU/GPU/RAM, kernel, Mesa, model, source commit, and measured times. Never use private course media.

## Web UI Smoke

```sh
npm run build
node dist/index.js api --port 8788
# In another terminal:
node dist/index.js web --port 8787
```

Open `http://127.0.0.1:8787/`, verify `/healthz` and navigation routes. Do not start archive, OCR, transcription, or bulk-download jobs without explicit operator approval.
