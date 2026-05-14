# Docker Compose

## Purpose

Run Zenbukko with repeatable local volumes and optional GPU image support.

## Services

- `zenbukko`: CLI service.
- `zenbukko-web`: CPU web service on `127.0.0.1:8787`.
- `zenbukko-gpu`: GPU CLI service behind the `gpu` profile.
- `zenbukko-web-gpu`: GPU web service behind the `gpu` profile.
- GPU services are the NDLOCR CUDA path when the NVIDIA runtime is available.

## Commands

```sh
docker compose config
docker compose build zenbukko
docker compose run --rm --entrypoint /bin/sh zenbukko -c 'command -v ndlocr-lite; command -v pdftoppm'
docker compose run --rm --entrypoint npm zenbukko run type-check
docker compose run --rm --entrypoint npm zenbukko run lint
docker compose run --rm --entrypoint npm zenbukko run test
docker compose --profile gpu build zenbukko-gpu
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

The repository `./data` directory is mounted at `/data`. Session, settings, jobs, and downloads should be considered local private data.

Create the host directory before running Compose so Docker does not create it as root:

```sh
mkdir -p data
```

If `zenbukko auth` cannot write `data/session.json` after a Docker run, restore ownership:

```sh
sudo chown -R "$(id -u):$(id -g)" data
```

## Failure Behavior

GPU image build verification does not prove NDLOCR CUDA runtime execution unless a compatible NVIDIA runtime is available.
