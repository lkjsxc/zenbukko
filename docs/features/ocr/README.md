# OCR

## Purpose

OCR converts normalized material PDFs into Markdown using Gemini.

## Files

- [`pipeline.md`](pipeline.md): OCR discovery, planning, execution, and output writing.
- [`gemini-modes.md`](gemini-modes.md): Batch, Flex, and Standard tier behavior.
- [`manifest.md`](manifest.md): OCR result manifest contract.

## Invariants

- OCR receives PDFs only.
- Material directories use `materials_manifest.json` PDF entries before recursive PDF fallback.
- Standalone OCR refreshes manifest-backed material PDFs before discovery.
- `auto` mode prefers Batch only when there is meaningful multi-PDF work.
- Batch failures recover through Flex unless Standard is explicitly requested.
