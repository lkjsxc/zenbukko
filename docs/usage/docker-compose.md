# Docker Compose

## Purpose

Run Zenbukko with repeatable local volumes and optional Linux NVIDIA CUDA image support.

## Services

- `zenbukko-api`: CPU Core API and CLI-capable service under the `cpu` profile.
- `zenbukko-web`: CPU lightweight Web UI and `/api/*` proxy under the `cpu` profile.
- `zenbukko-api-gpu`: Linux NVIDIA CUDA Core API service behind the `gpu` profile.
- `zenbukko-web-gpu`: Web proxy for the GPU API on `0.0.0.0:8787` behind the `gpu` profile.

Use exactly one runtime profile for `up`:

```sh
docker compose --profile cpu up --build
docker compose --profile gpu up --build
```

Both Web services publish the UI on host `0.0.0.0:8787` so another machine on the reachable network can open `http://<host-ip>:8787/`.

## CPU Verification

```sh
docker compose config
docker compose --profile cpu config --services
docker compose --profile cpu build zenbukko-api zenbukko-web
docker compose --profile cpu run --rm --entrypoint /bin/sh zenbukko-api -c 'command -v ndlocr-lite; command -v pdftoppm'
docker compose --profile cpu run --rm --entrypoint npm zenbukko-api run smoke:local-ocr
```

CPU services run local OCR and local whisper.cpp in the container.

## GPU Verification

GPU services are Linux NVIDIA CUDA only. Run these only on a host with NVIDIA Container Toolkit and compatible hardware:

```sh
docker compose --profile gpu config
docker compose --profile gpu build zenbukko-api-gpu zenbukko-web-gpu
docker compose --profile gpu run --rm --entrypoint npm zenbukko-api-gpu run smoke:local-ocr
```

macOS and Windows operators should use native local setup or CPU containers. Do not expect Docker GPU acceleration outside the Linux NVIDIA CUDA profile.

## Build Cache

Dockerfiles build and download whisper.cpp before copying application source. Normal TypeScript, docs, and test edits should reuse the whisper layer.

Whisper rebuilds are expected only when these inputs change:

- `WHISPER_MODEL`
- CPU/GPU Dockerfile commands before the whisper layer
- GPU build args such as `ZENBUKKO_CMAKE_CUDA_ARCHITECTURES`
- Docker cache pruning or `--no-cache`

## Data

The API service mounts `./data` at `/data`. Session, settings, jobs, and downloads should be considered local private data.

The Web service mounts only `./data/web-ui` at `/web-data` for its lightweight runtime state. It does not receive `/data/downloads`, Chromium, OCR binaries, or Whisper.

Create the host data directory before running Compose:

```sh
mkdir -p data data/web-ui
```

The API image runs as the container `node` user. On hosts where the local user is not UID `1000`, make the bind mount writable by that container user before starting the API:

```sh
sudo chown -R 1000:1000 data
```

The Web image repairs `/web-data` ownership at startup before dropping to the `node` user, so an auto-created `data/web-ui` bind mount is still writable by the Web process.

If local CLI runs need to write `data/session.json` after Docker use, restore host ownership:

```sh
sudo chown -R "$(id -u):$(id -g)" data
```

## Failure Behavior

GPU image build verification does not prove local CUDA OCR execution unless a compatible NVIDIA runtime is available.
