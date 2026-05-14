# Docker Compose

## Purpose

Run Zenbukko with repeatable local volumes and optional GPU image support.

## Services

- `zenbukko-api`: Core API and CLI-capable service, internal port `8788`.
- `zenbukko-web`: lightweight Web UI and `/api/*` proxy on `127.0.0.1:8787`.
- `zenbukko-api-gpu`: GPU Core API service behind the `gpu` profile.
- `zenbukko-web-gpu`: GPU Web proxy on `127.0.0.1:8789` behind the `gpu` profile.
- GPU API services are the NDLOCR CUDA path when the NVIDIA runtime is available.

## Commands

```sh
docker compose config
docker compose build zenbukko-api zenbukko-web
docker compose run --rm --entrypoint /bin/sh zenbukko-api -c 'command -v ndlocr-lite; command -v pdftoppm'
docker compose run --rm --entrypoint npm zenbukko-api run type-check
docker compose run --rm --entrypoint npm zenbukko-api run lint
docker compose run --rm --entrypoint npm zenbukko-api run test
docker compose --profile gpu build zenbukko-api-gpu zenbukko-web-gpu
```

OCR smoke checks that depend on packaged binaries are Docker-gated. Run them from built Docker images with sample inputs mounted under `/data`.

## Build Cache

Dockerfiles build and download whisper.cpp before copying application source. Normal TypeScript, docs, and test edits should reuse the whisper layer.

Whisper rebuilds are expected only when these inputs change:

- `WHISPER_MODEL`
- CPU/GPU Dockerfile commands before the whisper layer
- GPU build args such as `ZENBUKKO_CMAKE_CUDA_ARCHITECTURES`
- Docker cache pruning or `--no-cache`

## Data

The API service mounts `./data` at `/data`. Session, settings, jobs, and downloads should be considered local private data.

The Web service mounts only `./data/web-ui` at `/web-data` for its generated browser token. It does not receive `/data/downloads`, Chromium, OCR binaries, or Whisper.

Create the host directory before running Compose so Docker does not create it as root:

```sh
mkdir -p data data/web-ui
```

If `zenbukko auth` cannot write `data/session.json` after a Docker run, restore ownership:

```sh
sudo chown -R "$(id -u):$(id -g)" data
```

## Failure Behavior

GPU image build verification does not prove NDLOCR CUDA runtime execution unless a compatible NVIDIA runtime is available.
