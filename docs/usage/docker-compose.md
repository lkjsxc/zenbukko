# Docker Compose

## Purpose

Run Zenbukko’s local API and Web UI with a single, explicit Whisper backend profile.

## Start One Profile

```sh
mkdir -p data data/web-ui
docker compose --profile cpu up --build
docker compose --profile cuda up --build
docker compose --profile vulkan up --build
```

Use exactly one profile at a time. The UI is published at `http://127.0.0.1:8787/` (or the host address allowed by the port mapping).

- `cpu`: `zenbukko-api` and `zenbukko-web`.
- `cuda`: `zenbukko-api-cuda` and `zenbukko-web-cuda`.
- `vulkan`: `zenbukko-api-vulkan` and `zenbukko-web-vulkan`.

`gpu` was an ambiguous legacy profile name and is not a Compose profile. CUDA and Vulkan are separate installations and diagnostics.

## Vulkan: Radeon 780M

Vulkan is the primary Docker path for an AMD Radeon 780M on Linux x86_64. It uses the normal amdgpu kernel driver and Mesa RADV userspace; it does **not** use ROCm, HIP, OpenCL, or `/dev/kfd`.

The host must provide all of the following:

- Linux x86_64, a Vulkan-capable GPU, and a working amdgpu driver.
- A usable `/dev/dri/renderD*` node.
- Docker permission to map `/dev/dri`.
- A host Vulkan ICD that can enumerate the GPU.

The Vulkan API maps only `/dev/dri`, not privileged mode, host networking, `/dev/kfd`, host Vulkan libraries, or broad host mounts. Its entrypoint discovers each mapped render-node GID, adds only the unprivileged `node` user to matching supplementary groups, then drops privileges. It never changes host device permissions.

The image contains both Vulkan and CPU Whisper executables. Its default is explicit `vulkan`, so a missing or inaccessible device makes startup fail with an actionable `probe-whisper` error. Set `ZENBUKKO_WHISPER_BACKEND=auto` deliberately to permit `vulkan -> cpu` fallback; the warning identifies the unavailable capability. Docker Desktop platforms that cannot expose DRM render nodes should use CPU.

NDLOCR-Lite remains CPU-only in every profile (`ZENBUKKO_NDLOCR_DEVICE=cpu`).

## CUDA

CUDA needs Linux x86_64, NVIDIA Container Toolkit, and a visible NVIDIA GPU. It uses an explicit `cuda` backend by default and also keeps a CPU Whisper executable for deliberate `auto` fallback. CUDA does not change the OCR device contract.

## Models And Rebuilds

Whisper models live in the Docker-managed `whisper-models` volume mounted at `/data/models/whisper`; they are not baked into CPU, CUDA, or Vulkan image layers. Startup downloads the requested `WHISPER_MODEL` once to a temporary file, verifies the upstream published SHA-1, then atomically installs it. An interrupted, empty, or checksum-mismatched file fails clearly and is not accepted.

Application TypeScript, Web UI, and documentation changes do not invalidate the Whisper C++ or model layers. `WHISPER_CPP_REF` may override the pinned build commit explicitly; its default is recorded in [`../../docker/whisper.cpp.ref`](../../docker/whisper.cpp.ref).

## Verification

```sh
docker compose config
docker compose --profile cpu config
docker compose --profile cuda config
docker compose --profile vulkan config
docker compose --profile cpu build
docker compose --profile vulkan build
```

On a Vulkan host, also run as the container’s normal user:

```sh
docker compose --profile vulkan run --rm --entrypoint /bin/sh zenbukko-api-vulkan -c 'id; vulkaninfo --summary'
docker compose --profile vulkan run --rm zenbukko-api-vulkan probe-whisper
```

Use the OCR smoke command in each API image. A real transcription or benchmark requires an explicitly selected non-private input file.

## Data

The API bind-mounts `./data` at `/data`; sessions, downloads, and jobs remain local private data. The Web service receives only `./data/web-ui`. Do not run the API process as root or share session JSON in logs.
