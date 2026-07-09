# Zenbukko

Zenbukko is a local course archive and study-material processing toolkit. It downloads accessible NNN course lessons and materials, can transcribe media with whisper.cpp, and can extract text from PDFs into Markdown.

Documentation lives in [`docs/`](docs/README.md). Start there for architecture, usage, feature behavior, API contracts, and development rules.

## Native Quick Start

Install both workspaces with either package manager. Build scripts do not invoke npm or pnpm internally.

```sh
# npm (lockfile-backed)
npm ci
npm --prefix web-ui ci
npm run build
node dist/index.js doctor

# or pnpm when npm is unavailable
pnpm install --no-lockfile
pnpm --dir web-ui install --no-lockfile
pnpm run build
node dist/index.js doctor
```

Node.js 22 or newer is required. See [`docs/usage/native-setup.md`](docs/usage/native-setup.md) for Windows, browser, OCR, transcription, and server setup.

## Normal Use

Run `node dist/index.js doctor` to inspect native dependencies, then `node dist/index.js auth` to log in to NNN and save a local session. Course listing, downloads, and browser-created archive jobs expect that saved session unless you import a valid session JSON through the Web UI. Session JSON contains private cookies and must not be shared or committed.

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
