# AI-Assisted Setup

## Purpose

Use an AI coding assistant to prepare a private local Zenbukko environment without exposing NNN credentials. Docker Compose is the recommended default because it installs the pinned local OCR stack, Poppler, Chromium, ffmpeg, and whisper.cpp together.

## Safe Collaboration Boundary

An assistant may inspect `doctor` output, Compose logs, and public dependency errors. Do not provide it with session JSON, cookie headers, browser profiles, downloaded course files, or `.env` contents. Redact paths when they identify private course material.

Ask the assistant to stop before authentication. You complete NNN login yourself in a real browser, then keep the saved session file private.

## Recommended Paths

| Host | Recommended path | Why |
| --- | --- | --- |
| macOS, including Apple silicon | Docker Desktop CPU profile | Uses the AMD64 compatibility layer by default, so the pinned OCR stack runs consistently. |
| Windows | WSL2 + Docker Desktop integration | Linux tooling, paths, and container behavior match the supported CPU setup. |
| Linux x86_64 | Docker Compose CPU profile | Runs the same local-only stack without emulation. |
| Native development | Native setup | Use only when you need host-installed tools or are developing Zenbukko. |

The GPU profile remains Linux x86_64 with NVIDIA Container Toolkit only. It is not an Apple silicon or Windows GPU path.

## Start The CPU Stack

From the repository root, have the assistant run only these non-sensitive commands:

```sh
mkdir -p data data/web-ui
docker compose --profile cpu up --build
```

Open `http://127.0.0.1:8787/`. The image builds NDLOCR-Lite, Poppler, and the local Whisper runtime automatically; no host OCR installation is needed. The first AMD64 build on Apple silicon can take longer because Docker Desktop emulates that architecture.

If a non-x86 Linux host has a verified native ARM64 OCR stack, opt out of compatibility mode for that build:

```sh
ZENBUKKO_DOCKER_PLATFORM=linux/arm64 docker compose --profile cpu up --build
```

Use the default `linux/amd64` again if the native build is unavailable or fails.

## Authenticate Deliberately

The Dashboard leads to **Set up NNN session** while no session exists. Course browsing and archive jobs stay unavailable until a session is saved.

- Native or WSL2 installation with a browser: run `zenbukko auth`, complete login yourself, and let it save `data/session.json`.
- Docker-only installation: use **Set up NNN session** and paste a session JSON you exported privately. Do not run interactive browser auth inside the headless API container.

After saving the session, continue to **Browse courses**. See [`web-ui.md`](web-ui.md) for the browser workflow and [`native-setup.md`](native-setup.md) for the native auth path.

## Useful AI Prompt

> Inspect `docker compose --profile cpu config` and `docker compose --profile cpu logs`. Explain only missing public dependencies or permissions. Do not request, print, read, or modify session JSON, cookies, browser profiles, course files, or `.env` values. Stop before authentication.

## Failure Behavior

Do not switch OCR to a cloud provider or send PDFs to an AI service to work around a local failure. Keep the failure local, run `doctor` or the Compose OCR smoke check, and use the diagnostic to repair the local stack.
