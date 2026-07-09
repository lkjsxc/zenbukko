# Courses Screen

## Purpose

Browse authenticated course list and inspect chapters.

## Inputs

- `GET /api/courses`
- `GET /api/courses/:courseId` for detail panel

## Outputs

- Searchable table: ID, title, source tab.
- Read-only chapter list in a dismissible detail panel; chapter selection belongs to Archive.
- "Archive course" navigates to `#/archive?courseId=N`.

## Invariants

Requires session. 404 shows empty state with link to Session screen.

## Failure Behavior

Missing session, not loaded, loading, empty results, no search matches, and scrape failures have distinct states. A missing session links to Session. Scrape failures show inline recovery and a toast.
