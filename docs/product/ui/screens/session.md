# Session Screen

## Purpose

Import or replace browser session JSON.

## Inputs

- `GET /api/session` on load.
- Operator-edited JSON textarea.

## Outputs

- `POST /api/session` on save.
- Notice banner: ready or missing.
- Pretty-print and validate buttons (client-side `JSON.parse`).

## Invariants

Existing session pre-fills textarea. Save normalizes via Core API.

## Failure Behavior

Invalid JSON blocked before POST. API errors shown via toast.
