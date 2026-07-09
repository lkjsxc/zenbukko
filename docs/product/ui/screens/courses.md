# Courses Screen

## Purpose

Browse authenticated course list and inspect chapters.

## Inputs

- `GET /api/courses`
- `GET /api/courses/:courseId` for detail panel

## Outputs

- Searchable table: ID, title, source tab.
- Chapter checkbox grid in detail drawer.
- "Archive course" navigates to `#/archive?courseId=N`.

## Invariants

Requires session. 404 shows empty state with link to Session screen.

## Failure Behavior

Scrape failures show toast with error message.
