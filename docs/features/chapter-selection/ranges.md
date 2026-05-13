# Chapter Ranges

## Inputs

- `chapterRange`: one-based ordinal expression such as `1`, `1-15`, or `1,3-5`.
- `chapters`: explicit NNN chapter IDs for advanced use.

## Range Rules

- `1-5` selects the chapters that would be saved as `01` through `05`.
- Duplicate ordinals collapse while preserving first occurrence order.
- Invalid syntax, zero or negative ordinals, reversed ranges, and out-of-bounds ordinals fail before download starts.
