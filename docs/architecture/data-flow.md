# Data Flow

## Purpose

Show how requests move through Zenbukko and where persistent artifacts are written.

## CLI Flow

1. `src/index.ts` parses flags with Commander.
2. `loadConfig()` applies environment defaults.
3. Command handlers call shared workflow functions.
4. Workflow functions load session data through `SessionStore`.
5. NNN clients resolve course structure and signed media/material URLs.
6. Downloaders write files to `outputDir`.
7. Optional transcription, cleanup, and OCR run after relevant files exist.

## Web Flow

1. Express serves static UI files.
2. Browser reads `/api/status`, `/api/session`, and `/api/settings`.
3. Job forms submit normalized JSON to `/api/jobs`.
4. `WebJobQueue` persists job records and logs under `/data/web/jobs`.
5. Jobs call the same workflow functions as the CLI.
6. Logs stream through Server-Sent Events.

## OCR Flow

1. PDF discovery prefers `materials_manifest.json` assets and falls back to recursive PDF search.
2. Planning skips existing Markdown unless `force` is set.
3. `auto` mode selects Batch for multi-PDF/background work and Flex for single or recovery work.
4. Batch uploads PDFs to the Gemini Files API and sends inline batch requests using file URIs.
5. Failed Batch items retry through Flex unless Standard is explicitly selected.
6. Markdown and `materials_ocr_manifest.json` are written next to source materials.

## Invariants

- Course chapter folder numbers use one-based full-course chapter order.
- `1-15` refers to chapter ordinals, not NNN chapter IDs.
- Explicit chapter IDs remain supported as an advanced path.
