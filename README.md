# Zenbukko

Zenbukko is a local course archive and study-material processing toolkit. It downloads accessible NNN course lessons and materials, can transcribe media with whisper.cpp, and can extract text from PDFs into Markdown.

Documentation lives in [`docs/`](docs/README.md). Start there for architecture, usage, feature behavior, API contracts, and development rules.

## Quick Commands

```sh
npm install
npm run type-check
npm run lint
npm test
docker compose config
docker compose build zenbukko
```

## Main Entrypoints

- CLI: `zenbukko auth`, `zenbukko list-courses`, `zenbukko download`, `zenbukko download-all`, `zenbukko ocr-materials`, `zenbukko setup-whisper`, `zenbukko transcribe`.
- Web UI: `zenbukko web` or `docker compose up zenbukko-web`.
- Docker data: bind `./data` to `/data`; session defaults to `/data/session.json`; downloads default to `/data/downloads`.

## Documentation Index

- [`docs/architecture/`](docs/architecture/README.md): module layout and data flow.
- [`docs/llm/`](docs/llm/README.md): LLM-friendly index for cross-references and schema contracts.
- [`docs/usage/`](docs/usage/README.md): CLI, web UI, Docker Compose, and outputs.
- [`docs/features/`](docs/features/README.md): sessions, chapter selection, materials, OCR, and transcription.
- [`docs/reference/`](docs/reference/README.md): configuration, API, file layout, troubleshooting.
- [`docs/development/`](docs/development/README.md): coding rules, tests, commits, verification.
