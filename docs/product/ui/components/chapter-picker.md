# Chapter Picker

## Purpose

Visual one-based chapter selection matching CLI range syntax.

## Inputs

- Chapter list from `GET /api/courses/:courseId`.
- Top action button to select every displayed chapter.
- Checkbox grid sorted by `order` then `id`.

## Outputs

- `chapterRange` string e.g. `1,3-5`.
- Live preview: selected ordinals and NNN IDs.

## Invariants

Uses same ordinal rules as `docs/features/chapter-selection/ranges.md`.
Bulk selection updates the same `chapterRange` preview and payload as manual checkbox selection.
Mutually exclusive with explicit chapter ID text field.

## Implementation

Pure helpers in `web-ui/src/utils/chapterRange.ts`. UI in `ChapterPicker.ts`.
