# Tests

## Purpose

Cover shared parsing and planning behavior without requiring external services.

## Required Coverage

- Chapter range parsing.
- Ordinal-to-NNN chapter ID mapping.
- Session parsing and prefill payloads.
- Web settings precedence.
- OCR task planning.
- Markdown normalization.
- Chapter OCR aggregation and backfill discovery.
- Line-limit enforcement.

## Commands

```sh
npm test
npm run type-check
npm run lint
```
