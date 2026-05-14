# Data Flow

## Purpose

Show how requests move through Zenbukko and where persistent artifacts are written.

## CLI Flow

1. `src/index.ts` parses flags with Commander.
2. `loadConfig()` applies environment defaults.
3. Command handlers call shared workflow functions.
4. Workflow functions load session data through `SessionStore`.
5. NNN clients resolve course structure and signed media/material URLs.
6. The downloader builds a full in-memory lesson work list before slow per-lesson work starts.
7. If materials are enabled, all selected lesson materials are fetched and normalized first.
8. Media download, transcription, cleanup, and OCR run only after the material capture phase.

## Web/Core Flow

1. `zenbukko web` serves static UI files and stores only its browser token.
2. Browser reads and writes same-origin `/api/*` through the Web proxy.
3. The Web proxy allows public `GET /api/status` and requires the browser token for sensitive `/api/*`.
4. `zenbukko api` receives proxied requests on port `8788`.
5. Job forms submit normalized JSON to Core API `/api/jobs`.
6. `ApiJobQueue` persists job records and logs under API-owned state.
7. Jobs call the same workflow functions as the CLI.
8. Logs stream through Server-Sent Events via the Web proxy.

## Materials And OCR Flow

1. For every selected lesson, material pages are saved as HTML before transcription or OCR begins.
2. Linked assets are downloaded under `assets/`.
3. Supported saved sources are normalized into PDFs under `pdf/`.
4. `materials_manifest.json` records source files, PDF files, conversion status, and OCR eligibility.
5. After all selected material directories exist, media and transcription may run.
6. OCR runs against the collected material directories after material capture has completed.
7. PDF discovery prefers manifest asset PDF entries and avoids duplicate reference-page PDFs when per-asset PDFs exist.
8. Planning skips existing Markdown unless `force` is set.
9. `ocrBackend=auto` prefers local OCR first, then Gemini recovery when configured.
10. Gemini Batch uploads PDFs to the Gemini Files API and sends inline batch requests using file URIs.
11. Failed Gemini Batch items retry through Flex unless Standard is explicitly selected.
12. Markdown and `materials_ocr_manifest.json` are written next to source materials.
13. Chapter OCR aggregates concatenate lesson `materials_ocr.md` files under each chapter directory.

## Invariants

- Course chapter folder numbers use one-based full-course chapter order.
- `1-15` refers to chapter ordinals, not NNN chapter IDs.
- Chapter range ordinals use the same displayed course order as chapter folder numbers.
- Explicit chapter IDs remain supported as an advanced path.
- Chapter OCR and transcript aggregates use the same chapter and lesson order.
