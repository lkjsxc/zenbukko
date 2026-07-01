# Dashboard Screen

## Purpose

Operator landing page showing system readiness and recent activity.

## Inputs

- `GET /api/status`
- `GET /api/jobs` (recent subset)
- `GET /api/outputs` (recent subset)

## Outputs

- Status cards: session, local OCR readiness, output directory.
- Local OCR details: command, device, and concise diagnostics.
- Recent jobs table (last 5).
- Recent outputs list (last 5).
- Quick links to Session, Courses, Archive.

## Invariants

Loads on `#/`. Shows loading skeleton until status returns.

## Failure Behavior

Status failure shows toast and retry button.
