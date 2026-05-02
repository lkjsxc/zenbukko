# Chapter Selection

## Purpose

Select course chapters by human course order or explicit NNN IDs.

## Inputs

- `chapterRange`: one-based ordinal expression such as `1`, `1-15`, or `1,3-5`.
- `chapters`: explicit NNN chapter IDs for advanced use.

## Mapping

The downloader fetches the full course chapter list, sorts it by course order, and maps range ordinals to NNN chapter IDs before lesson resolution.

## Invariants

- Ranges are one-based.
- Duplicate ordinals collapse while preserving first occurrence order.
- Explicit chapter IDs are not interpreted as ordinals.
- `chapterRange` and explicit `chapters` cannot both be used in the same request.

## Failure Behavior

Invalid syntax, zero or negative ordinals, reversed ranges, and out-of-bounds ordinals fail before download starts.
