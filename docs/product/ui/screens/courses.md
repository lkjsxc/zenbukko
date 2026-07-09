# Courses Screen

## Purpose

Browse a CLI-imported course list and inspect chapters.

## Inputs

- JSON pasted from `zenbukko list-courses --format json`.
- `GET /api/courses/:courseId` for detail panel.

## Outputs

- Searchable table: ID, title, source tab.
- Chapter table in the detail panel.
- "Archive course" navigates to `#/archive?courseId=N`.

## Invariants

Web UI does not scrape the NNN course list. Course-list discovery belongs to the CLI so browser automation stays in `zenbukko list-courses`.

## Failure Behavior

Invalid pasted JSON shows a toast. Course detail API failures show toast with error message.
