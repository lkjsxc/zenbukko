# Chapter Selection

## Purpose

Select course chapters by human course order or explicit NNN IDs.

## Files

- [`ranges.md`](ranges.md): one-based chapter range syntax.
- [`mapping.md`](mapping.md): course-order mapping from ordinals to NNN IDs.

## Invariants

- Ranges are one-based.
- Explicit chapter IDs are not interpreted as ordinals.
- `chapterRange` and explicit `chapters` cannot both be used in the same request.
