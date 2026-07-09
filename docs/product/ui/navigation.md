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

- Top bar: product name + session and local OCR status pills.
- Navigation is outside the semantic main content.
- Left sidebar on desktop; fixed bottom tab bar ≤768px with safe-area spacing.
- Main content area with cards and responsive split panes.
- Toast stack bottom-right and within the viewport on narrow screens.

## Invariants

`hashchange` renders only the destination view. Active nav uses `aria-current="page"`, and the main content receives focus after route changes.
