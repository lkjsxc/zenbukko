# Navigation

## Purpose

Hash-based client routing without server changes.

## Routes

- `#/` — Dashboard
- `#/session` — Session
- `#/courses` — Courses
- `#/archive` — Archive wizard (`?courseId=` supported)
- `#/jobs` — Jobs list
- `#/jobs/:id` — Job detail with log
- `#/outputs` — Outputs explorer
- `#/settings` — Settings

## Layout

- Top bar: product name + status pills.
- Left sidebar on desktop; bottom tab bar ≤768px.
- Main content area with cards and split panes.
- Toast stack bottom-right.

## Invariants

`hashchange` triggers view render. Active nav item reflects current route.
