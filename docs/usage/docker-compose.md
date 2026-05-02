# Docker Compose

## Purpose

Run Zenbukko with repeatable local volumes and optional GPU image support.

## Services

- `zenbukko`: CLI service.
- `zenbukko-web`: CPU web service on `127.0.0.1:8787`.
- `zenbukko-gpu`: GPU CLI service behind the `gpu` profile.
- `zenbukko-web-gpu`: GPU web service behind the `gpu` profile.

## Commands

```sh
docker compose config
docker compose build zenbukko
docker compose run --rm --entrypoint npm zenbukko run type-check
docker compose run --rm --entrypoint npm zenbukko run lint
docker compose run --rm --entrypoint npm zenbukko test
docker compose --profile gpu build zenbukko-gpu
```

## Data

The repository `./data` directory is mounted at `/data`. Session, settings, jobs, and downloads should be considered local private data.

## Failure Behavior

GPU image build verification does not prove CUDA runtime execution unless a compatible NVIDIA runtime is available.
