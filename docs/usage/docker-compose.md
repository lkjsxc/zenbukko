# Docker Compose

## Purpose

Run Zenbukko with repeatable local volumes, automatic local OCR installation, AMD64 compatibility for non-x86 Docker Desktop hosts, and optional Linux NVIDIA CUDA support.

## Services

- `zenbukko-api`: CPU Core API and CLI-capable service under the `cpu` profile.
- `zenbukko-web`: CPU lightweight Web UI and `/api/*` proxy under the `cpu` profile.
- `zenbukko-api-gpu`: Linux NVIDIA CUDA Core API service behind the `gpu` profile.
- `zenbukko-web-gpu`: Web proxy for the GPU API on `0.0.0.0:8787` behind the `gpu` profile.

Use exactly one runtime profile for `up`:

```sh
mkdir -p data data/web-ui
docker compose --profile cpu up --build
docker compose --profile gpu up --build
```

The CPU profile defaults to `linux/amd64`. Docker Desktop runs it natively on Intel hosts and through its compatibility layer on Apple silicon, so the pinned NDLOCR-Lite stack has one known runtime. The first emulated build can take longer. A non-x86 Linux host may opt into a verified native build with `ZENBUKKO_DOCKER_PLATFORM=linux/arm64`; return to the default if the native OCR dependencies are unavailable.

Both Web services publish the UI on host `0.0.0.0:8787` so another machine on the reachable network can open `http://<host-ip>:8787/`.

## CPU Verification

```sh
docker compose config
docker compose --profile cpu config --services
docker compose --profile cpu build zenbukko-api zenbukko-web
docker compose --profile cpu run --rm --entrypoint /bin/sh zenbukko-api -c 'command -v ndlocr-lite; command -v pdftoppm'
docker compose --profile cpu run --rm --entrypoint npm zenbukko-api run smoke:local-ocr
```

CPU services run local OCR and local whisper.cpp in the container. The image installs the pinned `ndlocr-lite` command, Poppler, and its Python environment during build, so no host OCR installation or model-provider credentials are required.

## GPU Verification

GPU services are Linux NVIDIA CUDA only. Run these only on a host with NVIDIA Container Toolkit and compatible hardware:

```sh
docker compose --profile gpu config
docker compose --profile gpu build zenbukko-api-gpu zenbukko-web-gpu
docker compose --profile gpu run --rm --entrypoint npm zenbukko-api-gpu run smoke:local-ocr
```

macOS and Windows operators should use the CPU containers. Windows users should prefer WSL2 with Docker Desktop integration; macOS Apple-silicon users use the CPU profile's AMD64 compatibility layer. Do not expect Docker GPU acceleration outside the Linux NVIDIA CUDA profile.

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

The API and Web entrypoints create their configured data directories, repair ownership for the supported `/data` and `/web-data` bind mounts when they start as root, then drop to the unprivileged `node` user. A normal `mkdir -p data data/web-ui` is enough; no manual `chown` is required for the supported Compose flow.

If a locked-down host forbids ownership changes on bind mounts, use a writable project checkout or a Docker-managed volume instead. If you later switch from Compose to a native Linux CLI, restore local ownership first:

```sh
sudo chown -R "$(id -u):$(id -g)" data
```

Do not run the API process itself as root.

## Failure Behavior

GPU image build verification does not prove local CUDA OCR execution unless a compatible NVIDIA runtime is available.
