# Zenbukko

Zenbukko is a local course archive and study-material processing toolkit. It downloads accessible NNN course lessons and materials, can transcribe media with whisper.cpp, and can extract text from PDFs into Markdown.

Documentation lives in [`docs/`](docs/README.md). Start there for architecture, usage, feature behavior, API contracts, and development rules.

## Recommended Quick Start

Use Docker Compose for the simplest local setup. It installs the pinned NDLOCR-Lite OCR stack, Poppler, Chromium, ffmpeg, and whisper.cpp inside the CPU image. It defaults to AMD64, which Docker Desktop runs through its compatibility layer on Apple silicon.

```sh
mkdir -p data data/web-ui
docker compose --profile cpu up --build
```

Open `http://127.0.0.1:8787/`. The Dashboard sends operators without an NNN session to **Set up NNN session** before course actions become available. Native or WSL2 users can run `zenbukko auth` in a real browser; Docker-only users import private session JSON through that screen. Never share or commit session JSON.

Windows users should prefer WSL2 with Docker Desktop integration. Linux NVIDIA GPU acceleration is optional; run `docker compose --profile gpu up --build` only on a supported Linux x86_64 host. See [`docs/usage/ai-assisted-setup.md`](docs/usage/ai-assisted-setup.md) for safe AI collaboration, platform guidance, and authentication details.

## Native Quick Start

Use native setup for development or when host tools are required. Install both workspaces with either package manager; Node.js 22 or newer is required.

```sh
npm ci
npm --prefix web-ui ci
npm run build
node dist/index.js doctor
node dist/index.js auth
```

`pnpm install --no-lockfile` installs both workspaces when npm is unavailable. See [`docs/usage/native-setup.md`](docs/usage/native-setup.md) for Windows, browser, OCR, transcription, and server setup.

## Main Entrypoints

- CLI: `zenbukko auth`, `zenbukko list-courses`, `zenbukko download`, `zenbukko download-all`, `zenbukko ocr-materials`, `zenbukko build-report-prompt`, `zenbukko setup-whisper`, `zenbukko transcribe`.
- Servers: `zenbukko api` for Core API and `zenbukko web` for static UI/proxy.
- Web UI: run `zenbukko api` and `zenbukko web`, or `docker compose --profile cpu up zenbukko-web`.
- Docker data: bind `./data` to `/data`; session defaults to `/data/session.json`; downloads default to `/data/downloads`.

## Documentation Index

- [`docs/architecture/`](docs/architecture/README.md): module layout and data flow.
- [`docs/llm/`](docs/llm/README.md): LLM-friendly index for cross-references and schema contracts.
- [`docs/usage/`](docs/usage/README.md): CLI, web UI, Docker Compose, and outputs.
- [`docs/features/`](docs/features/README.md): sessions, chapter selection, materials, OCR, transcription, and report prompts.
- [`docs/decisions/`](docs/decisions/README.md): accepted behavior decisions.
- [`docs/reference/`](docs/reference/README.md): configuration, API, file layout, troubleshooting.
- [`docs/development/`](docs/development/README.md): coding rules, tests, commits, verification.
