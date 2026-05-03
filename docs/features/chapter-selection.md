# Chapter Selection

## Purpose

Select course chapters by human course order or explicit NNN IDs.

## Inputs

- `chapterRange`: one-based ordinal expression such as `1`, `1-15`, or `1,3-5`.
- `chapters`: explicit NNN chapter IDs for advanced use.

## Mapping

The downloader fetches the full course chapter list in displayed course order and maps range ordinals to NNN chapter IDs before lesson resolution.

If the NNN API omits explicit `order` fields, the received display order is authoritative. The mapper must not sort those chapters by numeric NNN ID, because that makes `1-5` select unrelated saved folders such as `04,07,08,12,14`.

## Invariants

- Ranges are one-based.
- `1-5` selects the chapters that would be saved as `01` through `05`.
- Duplicate ordinals collapse while preserving first occurrence order.
- Explicit chapter IDs are not interpreted as ordinals.
- `chapterRange` and explicit `chapters` cannot both be used in the same request.

## Failure Behavior

Invalid syntax, zero or negative ordinals, reversed ranges, and out-of-bounds ordinals fail before download starts.
