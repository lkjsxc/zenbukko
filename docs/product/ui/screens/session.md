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

Invalid JSON is blocked before POST and shown inline. Validation, formatting, and API errors never discard the current textarea value. The save action exposes its in-flight state; API errors also show a toast.
