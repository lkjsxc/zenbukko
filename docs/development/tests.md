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
- Report prompt source discovery and template output.
- Line-limit enforcement.
- Web UI reducer, output filtering, router, and range edge behavior.
- Root type checking includes the nested `web-ui/` TypeScript project.

## Commands

```sh
npm test
npm run type-check
npm run lint
```
