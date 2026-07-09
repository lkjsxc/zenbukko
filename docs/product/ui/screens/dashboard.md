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

Loads on `#/`. The shell renders immediately and shows a loading state until status returns. Jobs, outputs, session, and settings load independently.

When session is missing, the primary action guides the operator to Session before course or archive actions.

## Failure Behavior

Status failure shows a persistent inline message, toast, and retry button without hiding other loaded data.
